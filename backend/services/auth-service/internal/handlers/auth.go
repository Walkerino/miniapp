package handlers

import (
	pkg_dto "auth-service/internal/pkg"
	authservice "auth-service/internal/service"
	"encoding/json"
	"errors"
	"net/http"
)

func (h *Handler) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req pkg_dto.RegisterRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		h.log.Logger.Error("register request body decoding error", "error", err)
		return
	}
	if err := validateAuthRequest(req.Email, req.Password); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	token, err := h.service.Register(req.Email, req.Password)
	if err != nil {
		if errors.Is(err, authservice.ErrEmailAlreadyExists) {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusBadRequest)
		h.log.Logger.Error("service error", "error", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(token)
}

func (h *Handler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req pkg_dto.LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		h.log.Logger.Error("login request body decoding error", "error", err)
		return
	}
	if err := validateAuthRequest(req.Email, req.Password); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	token, err := h.service.Login(req.Email, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		h.log.Logger.Error("service error", "error", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(token)
}

func (h *Handler) RefreshHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req pkg_dto.RefreshRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		h.log.Logger.Error("refresh request body decoding error", "error", err)
		return
	}
	if err := validateRefreshRequest(req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	token, err := h.service.Refresh(req.RefreshToken)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		h.log.Logger.Error("service error", "error", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(token)
}
