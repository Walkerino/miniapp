package handlers

import (
	"net/http"
	"strings"
)

func (h *Handler) SessionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	token := strings.TrimPrefix(r.URL.Path, "/miniapp-sessions/")
	if token == "" || token == r.URL.Path {
		writeError(w, http.StatusNotFound, "not_found", "Not found")
		return
	}
	resp, err := h.service.Session(token)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}
