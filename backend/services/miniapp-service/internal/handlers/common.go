package handlers

import (
	"encoding/json"
	"net"
	"net/http"
	"strconv"
	"strings"

	pkg_dto "miniapp-service/internal/pkg"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, pkg_dto.ErrorResponse{Error: code, Message: message})
}

func pageLimit(r *http.Request) (int, int) {
	page := intQuery(r, "page", 1)
	limit := intQuery(r, "limit", 20)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit
}

func intQuery(r *http.Request, key string, fallback int) int {
	value := r.URL.Query().Get(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func userContext(r *http.Request) (*pkg_dto.UserContext, bool) {
	userID := strings.TrimSpace(r.Header.Get("X-User-ID"))
	email := strings.TrimSpace(r.Header.Get("X-User-Email"))
	role := strings.TrimSpace(r.Header.Get("X-User-Role"))
	if userID == "" || email == "" || role == "" {
		return nil, false
	}
	var name *string
	if value := strings.TrimSpace(r.Header.Get("X-User-Name")); value != "" {
		name = &value
	}
	return &pkg_dto.UserContext{ID: userID, Email: email, Name: name, Role: role}, true
}

func clientIP(r *http.Request) string {
	if forwardedFor := r.Header.Get("X-Forwarded-For"); forwardedFor != "" {
		parts := strings.Split(forwardedFor, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}
