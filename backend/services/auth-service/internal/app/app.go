package app

import (
	"auth-service/config"
	"auth-service/internal/logger"
	"auth-service/internal/middleware"
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
)

func Run(logger *logger.Log, cfg *config.Config) {
	container := NewContainer(logger, cfg)
	container.Logger.Logger.Info("application initialized successfully")

	mux := http.NewServeMux()
	routes := []struct {
		path    string
		handler http.HandlerFunc
	}{
		{"/register", container.Handler.RegisterHandler},
		{"/login", container.Handler.LoginHandler},
		{"/refresh", container.Handler.RefreshHandler},
		{"/logout", container.Handler.LogoutHandler},
		{"/me", container.Handler.MeHandler},
		{"/me/name", container.Handler.UpdateNameHandler},
		{"/me/email", container.Handler.UpdateEmailHandler},
		{"/me/password", container.Handler.UpdatePasswordHandler},
		{"/validate", container.Handler.ValidateHandler},
		{"/health", container.Handler.HealthHandler},
		{"/admin/user", container.Handler.AdminUserHandler},
		{"/admin/users", container.Handler.AdminUsersHandler},
		{"/admin/users/promote", container.Handler.PromoteUserHandler},
		{"/admin/users/", container.Handler.UserActivationHandler},
	}
	routePaths := make([]string, 0, len(routes))
	for _, route := range routes {
		mux.HandleFunc(route.path, route.handler)
		routePaths = append(routePaths, route.path)
	}
	container.Logger.Logger.Info("registered routes", "routes", routePaths)

	publicPaths := map[string]struct{}{
		"/register": {},
		"/login":    {},
		"/refresh":  {},
		"/logout":   {},
		"/validate": {},
		"/health":   {},
	}
	handler := middleware.RequestLogger(container.Logger.Logger)(
		middleware.Auth(container.JWTService, publicPaths)(mux),
	)

	server := &http.Server{
		Addr:    cfg.Server.Addr,
		Handler: handler,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			container.Logger.Logger.Error("Server ListenAndServe error", "error", err)
		}
	}()

	container.Logger.Logger.Info("Server started", "addr", cfg.Server.Addr)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	container.Logger.Logger.Info("Shutdown signal received")

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.GracefulShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		container.Logger.Logger.Warn("Server forced to shutdown", "error", err)
	} else {
		container.Logger.Logger.Info("Server stopped gracefully")
	}
}
