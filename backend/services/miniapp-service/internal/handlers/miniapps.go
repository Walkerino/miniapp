package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	pkg_dto "miniapp-service/internal/pkg"
)

func (h *Handler) MiniappsHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := userContext(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	switch r.Method {
	case http.MethodGet:
		page, limit := pageLimit(r)
		resp, err := h.service.ListActive(user, page, limit, r.URL.Query().Get("search"))
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, resp)
	case http.MethodPost:
		var req pkg_dto.CreateMiniappRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
			return
		}
		resp, err := h.service.Suggest(user, req)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, resp)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
	}
}

func (h *Handler) MiniappByIDHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := userContext(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	id, action, ok := splitMiniappPath(r.URL.Path, "/miniapps/")
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "Not found")
		return
	}

	switch {
	case r.Method == http.MethodGet && action == "":
		resp, err := h.service.GetActive(user, id)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, resp)
	case r.Method == http.MethodPost && action == "launch":
		resp, err := h.service.Launch(user, id, r.UserAgent(), clientIP(r))
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, resp)
	case r.Method == http.MethodPost && action == "favorite":
		resp, err := h.service.AddFavorite(user, id)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, resp)
	case r.Method == http.MethodDelete && action == "favorite":
		if err := h.service.RemoveFavorite(user, id); err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusNoContent, nil)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
	}
}

func (h *Handler) FavoritesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}
	user, ok := userContext(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}
	page, limit := pageLimit(r)
	resp, err := h.service.ListFavorites(user, page, limit)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func splitMiniappPath(path, prefix string) (string, string, bool) {
	value := strings.TrimPrefix(path, prefix)
	if value == path || value == "" {
		return "", "", false
	}
	parts := strings.Split(strings.Trim(value, "/"), "/")
	if len(parts) == 1 {
		return parts[0], "", true
	}
	if len(parts) == 2 {
		return parts[0], parts[1], true
	}
	return "", "", false
}
