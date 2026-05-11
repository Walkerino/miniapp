package handlers

import (
	"errors"
	"net/http"

	miniappservice "miniapp-service/internal/service"
)

func handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, miniappservice.ErrBadRequest):
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request")
	case errors.Is(err, miniappservice.ErrForbidden):
		writeError(w, http.StatusForbidden, "forbidden", "Forbidden")
	case errors.Is(err, miniappservice.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "Not found")
	default:
		writeError(w, http.StatusInternalServerError, "internal_server_error", "Internal server error")
	}
}
