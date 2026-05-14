package app

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"ai-service/config"
	"ai-service/internal/logger"
	"ai-service/internal/middleware"
)

func Run(log *logger.Log, cfg *config.Config) {
	container := NewContainer(log, cfg)
	container.Logger.Logger.Info("application initialized successfully")

	mux := http.NewServeMux()
	mux.HandleFunc("/health", container.Handler.HealthHandler)
	mux.HandleFunc("/ai/generate", container.Handler.GenerateHandler)
	mux.HandleFunc("/ai/generated-apps/", container.Handler.GeneratedAppHandler)
	mux.HandleFunc("/generated-apps/", container.Handler.GeneratedAppConfigHandler)

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
