package app

import (
	"miniapp-service/config"
	"miniapp-service/internal/handlers"
	"miniapp-service/internal/logger"
	"miniapp-service/internal/repository/postgres"
	"miniapp-service/internal/service"
	"os"
)

type Container struct {
	Logger       *logger.Log
	Handler      *handlers.Handler
	miniappsRepo *postgres.MiniappRepository
	auditRepo    *postgres.AuditRepository
	launchesRepo *postgres.LaunchRepository
}

func NewContainer(log *logger.Log, cfg *config.Config) *Container {
	miniappsRepo, err := postgres.NewMiniappRepository(cfg.DB.URL)
	if err != nil {
		log.Logger.Error("failed to initialize miniapp repository", "error", err)
		os.Exit(1)
	}
	auditRepo, err := postgres.NewAuditRepository(cfg.DB.URL)
	if err != nil {
		log.Logger.Error("failed to initialize audit repository", "error", err)
		os.Exit(1)
	}
	launchesRepo, err := postgres.NewLaunchRepository(cfg.DB.URL)
	if err != nil {
		log.Logger.Error("failed to initialize launch repository", "error", err)
		os.Exit(1)
	}

	svc := service.NewService(miniappsRepo, auditRepo, launchesRepo, cfg.Launch.TokenTTL)
	handler := handlers.NewHandler(svc)

	return &Container{
		Logger:       log,
		Handler:      handler,
		miniappsRepo: miniappsRepo,
		auditRepo:    auditRepo,
		launchesRepo: launchesRepo,
	}
}
