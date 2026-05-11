package handlers

import (
	pkg_dto "auth-service/internal/pkg"
	"errors"
	"net/http"
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
