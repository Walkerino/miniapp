package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"auth-service/internal/utils"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
	bytes      int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if rw.statusCode == 0 {
		rw.statusCode = http.StatusOK
	}

	n, err := rw.ResponseWriter.Write(b)
	rw.bytes += n

	return n, err
}

func RequestLogger(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			rw := &responseWriter{
				ResponseWriter: w,
				statusCode:     0,
			}

			next.ServeHTTP(rw, r)

			duration := time.Since(start)

			log.Info("http request",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", rw.statusCode),
				slog.Int("bytes", rw.bytes),
				slog.Duration("duration", duration),
			)
		})
	}
}

type contextKey string

const (
	userIDContextKey contextKey = "user_id"
	emailContextKey  contextKey = "email"
)

func Auth(jwtService *utils.JWTService, publicPaths map[string]struct{}) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if _, ok := publicPaths[r.URL.Path]; ok {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			tokenString, ok := strings.CutPrefix(authHeader, "Bearer ")
			if !ok || strings.TrimSpace(tokenString) == "" {
				http.Error(w, "missing bearer token", http.StatusUnauthorized)
				return
			}

			claims, err := jwtService.Validate(strings.TrimSpace(tokenString))
			if err != nil {
				http.Error(w, "invalid bearer token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userIDContextKey, claims.UserID)
			ctx = context.WithValue(ctx, emailContextKey, claims.Email)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
