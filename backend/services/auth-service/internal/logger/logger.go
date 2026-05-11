package logger

import (
	"log/slog"
	"os"
)

type Log struct {
	Logger *slog.Logger
}

func NewLog() *Log {
	return &Log{
		Logger: slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}
