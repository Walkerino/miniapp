package main

import (
	"api-service/config"
	"api-service/internal/app"
	"api-service/internal/logger"
	"os"
)

func main() {
	log := logger.NewLog()

	cfg, err := config.Load()
	if err != nil {
		log.Logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	app.Run(log, cfg)
}
