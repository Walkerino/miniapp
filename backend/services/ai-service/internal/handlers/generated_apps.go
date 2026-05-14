package handlers

import (
	"encoding/json"
	"net/http"

	pkg_dto "ai-service/internal/pkg"
)

func (h *Handler) GenerateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}
	user, ok := userContext(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	var req pkg_dto.GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	resp, err := h.service.Generate(r.Context(), user, req)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *Handler) GeneratedAppHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}
	user, ok := userContext(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}
	id, ok := splitIDPath(r.URL.Path, "/generated-apps/")
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "Not found")
		return
	}
	resp, err := h.service.Get(user, id)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) GeneratedAppConfigHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}
	user, ok := userContext(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}
	id, ok := splitConfigPath(r.URL.Path)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "Not found")
		return
	}
	config, err := h.service.GetConfig(user, id)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, config)
}

func splitConfigPath(path string) (string, bool) {
	const prefix = "/generated-apps/"
	const suffix = "/config"
	if len(path) <= len(prefix)+len(suffix) {
		return "", false
	}
	if path[:len(prefix)] != prefix || path[len(path)-len(suffix):] != suffix {
		return "", false
	}
	id := path[len(prefix) : len(path)-len(suffix)]
	if id == "" || id[0] == '/' || id[len(id)-1] == '/' {
		return "", false
	}
	return id, true
}
