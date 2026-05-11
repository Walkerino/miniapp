package app

import (
	"api-service/config"
	"api-service/internal/handlers"
	"api-service/internal/logger"
	"api-service/internal/middleware"
	"api-service/internal/proxy"
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
)

func Run(log *logger.Log, cfg *config.Config) {
	gateway, err := proxy.NewGateway(cfg.Proxy.AuthServiceURL, cfg.Proxy.MiniappServiceURL, cfg.Request.Timeout, log.Logger)
	if err != nil {
		log.Logger.Error("failed to initialize gateway", "error", err)
		os.Exit(1)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", handlers.HealthHandler)

	mux.Handle("/api/auth/register", gateway.AuthProxy("/api/auth", false))
	mux.Handle("/api/auth/login", gateway.AuthProxy("/api/auth", false))
	mux.Handle("/api/auth/refresh", gateway.AuthProxy("/api/auth", false))
	mux.Handle("/api/auth/logout", gateway.AuthMiddleware(gateway.AuthProxy("/api/auth", true)))
	mux.Handle("/api/auth/me", gateway.AuthMiddleware(gateway.AuthProxy("/api/auth", true)))

	mux.Handle("/api/admin/users", gateway.AdminMiddleware(gateway.AuthProxy("/api", true)))
	mux.Handle("/api/admin/users/", gateway.AdminMiddleware(gateway.AuthProxy("/api", true)))
	mux.Handle("/api/admin/miniapps", gateway.AdminMiddleware(gateway.MiniappProxy("/api")))
	mux.Handle("/api/admin/miniapps/", gateway.AdminMiddleware(gateway.MiniappProxy("/api")))

	mux.Handle("/api/miniapp-sessions/", gateway.MiniappPublicProxy("/api"))
	mux.Handle("/api/favorites", gateway.AuthMiddleware(gateway.MiniappProxy("/api")))
	mux.Handle("/api/miniapps", gateway.AuthMiddleware(gateway.MiniappProxy("/api")))
	mux.Handle("/api/miniapps/", gateway.AuthMiddleware(gateway.MiniappProxy("/api")))

	corsConfig := middleware.CORSConfig{
		AllowedOrigins:   cfg.CORS.AllowedOrigins,
		AllowedMethods:   cfg.CORS.AllowedMethods,
		AllowedHeaders:   cfg.CORS.AllowedHeaders,
		ExposeHeaders:    cfg.CORS.ExposeHeaders,
		AllowCredentials: cfg.CORS.AllowCredentials,
		MaxAge:           cfg.CORS.MaxAge,
	}
	handler := middleware.RequestLogger(log.Logger)(
		middleware.CORS(corsConfig)(mux),
	)

	server := &http.Server{
		Addr:    cfg.Server.Addr,
		Handler: handler,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Logger.Error("server ListenAndServe error", "error", err)
		}
	}()

	log.Logger.Info("server started", "addr", cfg.Server.Addr)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Logger.Info("shutdown signal received")

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.GracefulShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Logger.Warn("server forced to shutdown", "error", err)
	} else {
		log.Logger.Info("server stopped gracefully")
	}
}
