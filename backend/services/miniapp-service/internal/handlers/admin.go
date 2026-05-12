package handlers

import (
	"encoding/json"
	"net/http"

	pkg_dto "miniapp-service/internal/pkg"
)

func (h *Handler) AdminMiniappsHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := userContext(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	switch r.Method {
	case http.MethodGet:
		if r.URL.Query().Get("metrics") == "true" {
			resp, err := h.service.AdminMetrics(user)
			if err != nil {
				handleServiceError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, resp)
			return
		}
		page, limit := pageLimit(r)
		resp, err := h.service.ListAll(user, page, limit, r.URL.Query().Get("status"), r.URL.Query().Get("search"))
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, resp)
	case http.MethodPost:
		var req pkg_dto.AdminCreateMiniappRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
			return
		}
		resp, err := h.service.AdminCreate(user, req)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, resp)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
	}
}

func (h *Handler) AdminMiniappByIDHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := userContext(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	id, action, ok := splitMiniappPath(r.URL.Path, "/admin/miniapps/")
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "Not found")
		return
	}

	switch {
	case r.Method == http.MethodGet && action == "":
		resp, err := h.service.AdminGet(user, id)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, resp)
	case r.Method == http.MethodPatch && action == "":
		var req pkg_dto.UpdateMiniappRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
			return
		}
		resp, err := h.service.AdminUpdate(user, id, req)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, resp)
	case r.Method == http.MethodDelete && action == "":
		if err := h.service.AdminDelete(user, id); err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusNoContent, nil)
	case r.Method == http.MethodPost && action == "publish":
		h.writeStatus(w, user, id, "active")
	case r.Method == http.MethodPost && action == "reject":
		if err := h.service.Reject(user, id); err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusNoContent, nil)
	case r.Method == http.MethodPost && action == "enable":
		h.writeStatus(w, user, id, "active")
	case r.Method == http.MethodPost && action == "disable":
		h.writeStatus(w, user, id, "disabled")
	default:
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
	}
}

func (h *Handler) writeStatus(w http.ResponseWriter, user *pkg_dto.UserContext, id, status string) {
	resp, err := h.service.SetStatus(user, id, status)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}
