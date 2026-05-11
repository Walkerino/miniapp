package app

import (
	"auth-service/config"
	"auth-service/internal/handlers"
	"auth-service/internal/logger"
	"auth-service/internal/repository/postgres"
	"auth-service/internal/service"
	"auth-service/internal/utils"
	"os"
)

type Container struct {
	Logger      *logger.Log
	Handler     *handlers.Handler
	JWTService  *utils.JWTService
	usersRepo   *postgres.UserRepository
	tokensRepo  *postgres.RefreshTokenRepository
	actionsRepo *postgres.AdminActionRepository
}

func NewContainer(logger *logger.Log, cfg *config.Config) *Container {
	usersRepo, err := postgres.NewUserRepository(cfg.DB.UserURL)
	if err != nil {
		logger.Logger.Error("failed to initialize user repository", "error", err)
		os.Exit(1)
	}
	tokensRepo, err := postgres.NewRefreshTokenRepository(cfg.DB.TokenURL)
	if err != nil {
		logger.Logger.Error("failed to initialize refresh token repository", "error", err)
		os.Exit(1)
	}
	actionsRepo, err := postgres.NewAdminActionRepository(cfg.DB.UserURL)
	if err != nil {
		logger.Logger.Error("failed to initialize admin action repository", "error", err)
		os.Exit(1)
	}

	hasher := utils.NewBcryptHasher(cfg.Bcrypt.Cost)
	jwtService := utils.NewJWTService(cfg.JWT.Secret, cfg.JWT.AccessTTL, cfg.JWT.RefreshTTL)
	svc := service.NewService(hasher, jwtService, tokensRepo, usersRepo, actionsRepo)
	handler := handlers.NewHandler(logger, svc)

	return &Container{
		Logger:      logger,
		Handler:     handler,
		JWTService:  jwtService,
		usersRepo:   usersRepo,
		tokensRepo:  tokensRepo,
		actionsRepo: actionsRepo,
	}
}
