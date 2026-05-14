package handlers

import (
	"encoding/json"
	"net"
	"net/http"
	"strconv"
	"strings"

	pkg_dto "ai-service/internal/pkg"
)

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, pkg_dto.ErrorResponse{Error: code, Message: message})
}

func userContext(r *http.Request) (*pkg_dto.UserContext, bool) {
	id := strings.TrimSpace(r.Header.Get("X-User-ID"))
	email := strings.TrimSpace(r.Header.Get("X-User-Email"))
	role := strings.TrimSpace(r.Header.Get("X-User-Role"))
	if id == "" || email == "" || role == "" {
		return nil, false
	}
	var name *string
	if value := strings.TrimSpace(r.Header.Get("X-User-Name")); value != "" {
		name = &value
	}
	return &pkg_dto.UserContext{ID: id, Email: email, Name: name, Role: role}, true
}

func splitIDPath(path, prefix string) (string, bool) {
	value := strings.TrimPrefix(path, prefix)
	if value == path || value == "" {
		return "", false
	}
	parts := strings.Split(strings.Trim(value, "/"), "/")
	if len(parts) != 1 || parts[0] == "" {
		return "", false
	}
	return parts[0], true
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

func pageLimit(r *http.Request) (int, int) {
	page := parsePositiveInt(r.URL.Query().Get("page"), 1)
	limit := parsePositiveInt(r.URL.Query().Get("limit"), 20)
	if limit > 100 {
		limit = 100
	}
	return page, limit
}

func parsePositiveInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
