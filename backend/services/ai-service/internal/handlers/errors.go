package handlers

import (
	"errors"
	"net/http"

	"ai-service/internal/service"
)

func handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrBadRequest):
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
	case errors.Is(err, service.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "Not found")
	default:
		writeError(w, http.StatusInternalServerError, "internal_server_error", err.Error())
	}
}
