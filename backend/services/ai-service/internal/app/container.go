package app

import (
	"ai-service/config"
	"ai-service/internal/handlers"
	"ai-service/internal/llm"
	"ai-service/internal/logger"
	"ai-service/internal/repository/postgres"
	"ai-service/internal/service"
	"os"
)

type Container struct {
	Logger  *logger.Log
	Handler *handlers.Handler
	repo    *postgres.GeneratedAppRepository
}

func NewContainer(log *logger.Log, cfg *config.Config) *Container {
	repo, err := postgres.NewGeneratedAppRepository(cfg.DB.URL)
	if err != nil {
		log.Logger.Error("failed to initialize generated app repository", "error", err)
		os.Exit(1)
	}

	llmClient := llm.NewClient(
		cfg.LLM.BaseURL,
		cfg.LLM.APIKey,
		cfg.LLM.Model,
		cfg.LLM.Timeout,
		cfg.LLM.MaxTokens,
		cfg.LLM.Temperature,
	)
	svc := service.NewService(repo, llmClient, cfg.MiniappURL)
	handler := handlers.NewHandler(svc)

	return &Container{
		Logger:  log,
		Handler: handler,
		repo:    repo,
	}
}
