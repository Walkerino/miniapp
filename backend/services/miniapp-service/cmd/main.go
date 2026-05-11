package main

import (
	"miniapp-service/config"
	"miniapp-service/internal/app"
	"miniapp-service/internal/logger"
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
