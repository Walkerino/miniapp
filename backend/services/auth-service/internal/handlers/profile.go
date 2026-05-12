package handlers

import (
	pkg_dto "auth-service/internal/pkg"
	authservice "auth-service/internal/service"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

func (h *Handler) UpdateNameHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	token, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
		return
	}

	var req pkg_dto.UpdateNameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid name request")
		return
	}

	user, err := h.service.UpdateName(token, req.Name)
	if err != nil {
		h.writeProfileError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) UpdateEmailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	token, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
		return
	}

	var req pkg_dto.UpdateEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}
	if err := validateAuthRequest(req.Email, req.CurrentPassword); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid email request")
		return
	}

	user, err := h.service.UpdateEmail(token, req.Email, req.CurrentPassword)
	if err != nil {
		h.writeProfileError(w, err)
		return
	}

	clearRefreshTokenCookie(w)
	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) UpdatePasswordHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	token, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
		return
	}

	var req pkg_dto.UpdatePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}
	if len(req.CurrentPassword) < 6 || len(req.NewPassword) < 6 {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid password request")
		return
	}
	if req.CurrentPassword == req.NewPassword {
		writeError(w, http.StatusBadRequest, "bad_request", "New password must be different")
		return
	}

	user, err := h.service.UpdatePassword(token, req.CurrentPassword, req.NewPassword)
	if err != nil {
		h.writeProfileError(w, err)
		return
	}

	clearRefreshTokenCookie(w)
	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) DeleteOwnAccountHandler(w http.ResponseWriter, r *http.Request) {
	token, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
		return
	}

	var req pkg_dto.DeleteAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}
	if len(req.CurrentPassword) < 6 {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid delete account request")
		return
	}

	if err := h.service.DeleteOwnAccount(token, req.CurrentPassword); err != nil {
		h.writeProfileError(w, err)
		return
	}

	clearRefreshTokenCookie(w)
	writeJSON(w, http.StatusNoContent, nil)
}

func (h *Handler) writeProfileError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, authservice.ErrEmailAlreadyExists):
		writeError(w, http.StatusConflict, "conflict", err.Error())
	case errors.Is(err, authservice.ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, "unauthorized", err.Error())
	case errors.Is(err, authservice.ErrInactiveUser):
		writeError(w, http.StatusForbidden, "forbidden", err.Error())
	case errors.Is(err, authservice.ErrUserNotFound):
		writeError(w, http.StatusNotFound, "not_found", err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "internal_server_error", "Internal server error")
		h.log.Logger.Error("profile service error", "error", err)
	}
}
