package app

import (
	"context"
	"miniapp-service/config"
	"miniapp-service/internal/logger"
	"miniapp-service/internal/middleware"
	"net/http"
	"os"
	"os/signal"
	"syscall"
)

func Run(log *logger.Log, cfg *config.Config) {
	container := NewContainer(log, cfg)
	container.Logger.Logger.Info("application initialized successfully")

	mux := http.NewServeMux()
	mux.HandleFunc("/health", container.Handler.HealthHandler)
	mux.HandleFunc("/miniapps", container.Handler.MiniappsHandler)
	mux.HandleFunc("/miniapps/", container.Handler.MiniappByIDHandler)
	mux.HandleFunc("/favorites", container.Handler.FavoritesHandler)
	mux.HandleFunc("/admin/audit", container.Handler.AdminAuditHandler)
	mux.HandleFunc("/admin/miniapps", container.Handler.AdminMiniappsHandler)
	mux.HandleFunc("/admin/miniapps/", container.Handler.AdminMiniappByIDHandler)
	mux.HandleFunc("/miniapp-sessions/", container.Handler.SessionHandler)

	handler := middleware.RequestLogger(container.Logger.Logger)(mux)

	server := &http.Server{
		Addr:    cfg.Server.Addr,
		Handler: handler,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			container.Logger.Logger.Error("server ListenAndServe error", "error", err)
		}
	}()

	container.Logger.Logger.Info("server started", "addr", cfg.Server.Addr)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	container.Logger.Logger.Info("shutdown signal received")

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.GracefulShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		container.Logger.Logger.Warn("server forced to shutdown", "error", err)
	} else {
		container.Logger.Logger.Info("server stopped gracefully")
	}
}
