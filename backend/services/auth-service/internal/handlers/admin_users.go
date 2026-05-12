package handlers

import (
	pkg_dto "auth-service/internal/pkg"
	authservice "auth-service/internal/service"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

func (h *Handler) AdminUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	token, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
		return
	}

	page := queryInt(r, "page", 1)
	limit := queryInt(r, "limit", 20)
	role := strings.TrimSpace(r.URL.Query().Get("role"))
	search := strings.TrimSpace(r.URL.Query().Get("search"))

	resp, err := h.service.ListUsers(token, page, limit, role, search)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) AdminUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	token, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
		return
	}

	var req pkg_dto.GetUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}
	if strings.TrimSpace(req.Email) == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid user request")
		return
	}

	user, err := h.service.GetUserByEmail(token, req.Email)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) PromoteUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	token, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
		return
	}

	var req pkg_dto.PromoteUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}
	if strings.TrimSpace(req.Email) == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid promote request")
		return
	}

	user, err := h.service.PromoteUser(token, req.Email)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) UserActivationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	token, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/admin/users/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || parts[0] == "" {
		writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}

	active := false
	switch parts[1] {
	case "activate":
		active = true
	case "deactivate":
		active = false
	default:
		writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}

	user, err := h.service.SetUserActive(token, parts[0], active)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, authservice.ErrForbidden):
		writeError(w, http.StatusForbidden, "forbidden", err.Error())
	case errors.Is(err, authservice.ErrInactiveUser):
		writeError(w, http.StatusForbidden, "forbidden", err.Error())
	case errors.Is(err, authservice.ErrUserNotFound):
		writeError(w, http.StatusNotFound, "not_found", err.Error())
	case errors.Is(err, authservice.ErrInvalidRole):
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
	default:
		writeError(w, http.StatusUnauthorized, "unauthorized", err.Error())
	}
}
