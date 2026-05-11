package handlers

import (
	pkg_dto "auth-service/internal/pkg"
	authservice "auth-service/internal/service"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

func (h *Handler) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	var req pkg_dto.RegisterRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		h.log.Logger.Error("register request body decoding error", "error", err)
		return
	}
	if err := validateRegisterRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid register request")
		return
	}

	token, err := h.service.Register(req.Email, req.Password, req.Name, r.UserAgent(), clientIP(r))
	if err != nil {
		if errors.Is(err, authservice.ErrEmailAlreadyExists) {
			writeError(w, http.StatusConflict, "conflict", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_server_error", "Internal server error")
		h.log.Logger.Error("service error", "error", err)
		return
	}

	writeJSON(w, http.StatusCreated, token)
}

func (h *Handler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	var req pkg_dto.LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		h.log.Logger.Error("login request body decoding error", "error", err)
		return
	}
	if err := validateAuthRequest(req.Email, req.Password); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid login request")
		return
	}

	token, err := h.service.Login(req.Email, req.Password, r.UserAgent(), clientIP(r))
	if err != nil {
		status := http.StatusUnauthorized
		if errors.Is(err, authservice.ErrInactiveUser) {
			status = http.StatusForbidden
		}
		writeError(w, status, "unauthorized", err.Error())
		h.log.Logger.Error("service error", "error", err)
		return
	}

	writeJSON(w, http.StatusOK, token)
}

func (h *Handler) RefreshHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	var req pkg_dto.RefreshRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		h.log.Logger.Error("refresh request body decoding error", "error", err)
		return
	}
	if err := validateRefreshRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid refresh request")
		return
	}

	token, err := h.service.Refresh(req.RefreshToken, r.UserAgent(), clientIP(r))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", err.Error())
		h.log.Logger.Error("service error", "error", err)
		return
	}

	writeJSON(w, http.StatusOK, token)
}

func (h *Handler) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	var req pkg_dto.LogoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		h.log.Logger.Error("logout request body decoding error", "error", err)
		return
	}
	if strings.TrimSpace(req.RefreshToken) == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid logout request")
		return
	}

	if err := h.service.Logout(req.RefreshToken); err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", err.Error())
		return
	}

	writeJSON(w, http.StatusNoContent, nil)
}

func (h *Handler) MeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	token, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
		return
	}

	user, err := h.service.Me(token)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, user)
}
