package main

import (
	"auth-service/config"
	"auth-service/internal/app"
	"auth-service/internal/logger"
	"os"
)

func main() {
	logger := logger.NewLog()

	cfg, err := config.Load()
	if err != nil {
		logger.Logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	app.Run(logger, cfg)
}
