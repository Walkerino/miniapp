package handlers

import (
	pkg_dto "auth-service/internal/pkg"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
)

var ErrInvalidRequest = errors.New("invalid request")

func validateAuthRequest(email, password string) error {
	email = strings.TrimSpace(email)

	if email == "" || password == "" {
		return ErrInvalidRequest
	}
	if !strings.Contains(email, "@") {
		return ErrInvalidRequest
	}
	if len(password) < 6 {
		return ErrInvalidRequest
	}

	return nil
}

func validateRegisterRequest(req pkg_dto.RegisterRequest) error {
	if err := validateAuthRequest(req.Email, req.Password); err != nil {
		return err
	}
	if strings.TrimSpace(req.Name) == "" {
		return ErrInvalidRequest
	}

	return nil
}

func validateRefreshRequest(req pkg_dto.RefreshRequest) error {
	if strings.TrimSpace(req.RefreshToken) == "" {
		return ErrInvalidRequest
	}

	return nil
}

func bearerToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	token, ok := strings.CutPrefix(authHeader, "Bearer ")
	if !ok || strings.TrimSpace(token) == "" {
		return "", ErrInvalidRequest
	}

	return strings.TrimSpace(token), nil
}

func clientIP(r *http.Request) string {
	if forwardedFor := r.Header.Get("X-Forwarded-For"); forwardedFor != "" {
		ip, _, _ := strings.Cut(forwardedFor, ",")
		return strings.TrimSpace(ip)
	}
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return strings.TrimSpace(realIP)
	}
	host, _, ok := strings.Cut(r.RemoteAddr, ":")
	if ok {
		return host
	}
	return r.RemoteAddr
}

func queryInt(r *http.Request, key string, fallback int) int {
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

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if status != http.StatusNoContent {
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, pkg_dto.ErrorResponse{
		Error:   code,
		Message: message,
	})
}
