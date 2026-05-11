package handlers

import "net/http"

func (h *Handler) ValidateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	token, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
		return
	}

	claims, err := h.service.ValidateAccessToken(token)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid bearer token")
		return
	}

	writeJSON(w, http.StatusOK, claims)
}
