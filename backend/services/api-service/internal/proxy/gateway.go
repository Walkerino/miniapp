package proxy

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type contextKey string

const userContextKey contextKey = "user_context"

type Gateway struct {
	authBase    *url.URL
	miniappBase *url.URL
	client      *http.Client
	log         *slog.Logger
}

func NewGateway(authURL, miniappURL string, timeout time.Duration, log *slog.Logger) (*Gateway, error) {
	authBase, err := url.Parse(authURL)
	if err != nil {
		return nil, err
	}
	miniappBase, err := url.Parse(miniappURL)
	if err != nil {
		return nil, err
	}
	return &Gateway{
		authBase:    authBase,
		miniappBase: miniappBase,
		client:      &http.Client{Timeout: timeout},
		log:         log,
	}, nil
}

func (g *Gateway) AuthProxy(stripPrefix string, protected bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if protected {
			ctx, ok := userContextFromRequest(r)
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
				return
			}
			addUserHeaders(r, ctx)
		}
		g.proxy(w, r, g.authBase, stripPrefix)
	}
}

func (g *Gateway) MiniappProxy(stripPrefix string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := userContextFromRequest(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
			return
		}
		addUserHeaders(r, ctx)
		g.proxy(w, r, g.miniappBase, stripPrefix)
	}
}

func (g *Gateway) MiniappPublicProxy(stripPrefix string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		g.proxy(w, r, g.miniappBase, stripPrefix)
	}
}

func (g *Gateway) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, err := bearerToken(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
			return
		}

		user, err := g.validateToken(r.Context(), token)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid bearer token")
			return
		}
		if !user.IsActive {
			writeError(w, http.StatusForbidden, "forbidden", "User is inactive")
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (g *Gateway) AdminMiddleware(next http.Handler) http.Handler {
	return g.AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := userContextFromRequest(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
			return
		}
		if user.Role != "admin" {
			writeError(w, http.StatusForbidden, "forbidden", "Admin role required")
			return
		}
		next.ServeHTTP(w, r)
	}))
}

func (g *Gateway) proxy(w http.ResponseWriter, r *http.Request, base *url.URL, stripPrefix string) {
	target := *base
	path := strings.TrimPrefix(r.URL.Path, stripPrefix)
	if path == "" {
		path = "/"
	}
	target.Path = singleJoiningSlash(base.Path, path)
	target.RawQuery = r.URL.RawQuery

	req, err := http.NewRequestWithContext(r.Context(), r.Method, target.String(), r.Body)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_server_error", "Failed to create upstream request")
		return
	}
	copyHeaders(req.Header, r.Header)
	req.Host = target.Host
	appendForwardedHeaders(req, r)

	resp, err := g.client.Do(req)
	if err != nil {
		g.log.Error("upstream request failed", "target", target.String(), "error", err)
		writeError(w, http.StatusBadGateway, "bad_gateway", "Upstream service unavailable")
		return
	}
	defer resp.Body.Close()

	copyHeaders(w.Header(), resp.Header)
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

func (g *Gateway) validateToken(ctx context.Context, token string) (*UserContext, error) {
	target := *g.authBase
	target.Path = singleJoiningSlash(g.authBase.Path, "/validate")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := g.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("token validation failed")
	}
	var user UserContext
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return &user, nil
}

func addUserHeaders(r *http.Request, user *UserContext) {
	r.Header.Set("X-User-ID", user.UserID)
	r.Header.Set("X-User-Email", user.Email)
	r.Header.Set("X-User-Role", user.Role)
	if user.Name != nil {
		r.Header.Set("X-User-Name", *user.Name)
	}
}

func userContextFromRequest(r *http.Request) (*UserContext, bool) {
	user, ok := r.Context().Value(userContextKey).(*UserContext)
	return user, ok
}

func bearerToken(r *http.Request) (string, error) {
	token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !ok || strings.TrimSpace(token) == "" {
		return "", errors.New("missing bearer token")
	}
	return strings.TrimSpace(token), nil
}

func copyHeaders(dst, src http.Header) {
	for key, values := range src {
		if isHopByHopHeader(key) {
			continue
		}
		dst.Del(key)
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}

func appendForwardedHeaders(req, original *http.Request) {
	if ip := clientIP(original); ip != "" {
		prior := req.Header.Get("X-Forwarded-For")
		if prior != "" {
			req.Header.Set("X-Forwarded-For", prior+", "+ip)
		} else {
			req.Header.Set("X-Forwarded-For", ip)
		}
	}
	req.Header.Set("X-Forwarded-Host", original.Host)
	req.Header.Set("X-Forwarded-Proto", scheme(original))
}

func clientIP(r *http.Request) string {
	if forwardedFor := r.Header.Get("X-Forwarded-For"); forwardedFor != "" {
		parts := strings.Split(forwardedFor, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, ok := strings.Cut(r.RemoteAddr, ":")
	if ok {
		return host
	}
	return r.RemoteAddr
}

func scheme(r *http.Request) string {
	if proto := r.Header.Get("X-Forwarded-Proto"); proto != "" {
		return proto
	}
	if r.TLS != nil {
		return "https"
	}
	return "http"
}

func singleJoiningSlash(a, b string) string {
	aslash := strings.HasSuffix(a, "/")
	bslash := strings.HasPrefix(b, "/")
	switch {
	case aslash && bslash:
		return a + b[1:]
	case !aslash && !bslash:
		return a + "/" + b
	default:
		return a + b
	}
}

func isHopByHopHeader(header string) bool {
	switch strings.ToLower(header) {
	case "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade":
		return true
	default:
		return false
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": code, "message": message})
}

func cloneBody(r *http.Request) ([]byte, error) {
	if r.Body == nil {
		return nil, nil
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	r.Body = io.NopCloser(bytes.NewReader(body))
	return body, nil
}
