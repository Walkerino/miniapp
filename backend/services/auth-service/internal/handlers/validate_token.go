package handlers

import (
	"encoding/json"
	"net/http"
)

func (h *Handler) ValidateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token, err := bearerToken(r)
	if err != nil {
		http.Error(w, "missing bearer token", http.StatusUnauthorized)
		return
	}

	claims, err := h.service.ValidateAccessToken(token)
	if err != nil {
		http.Error(w, "invalid bearer token", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(claims)
}
