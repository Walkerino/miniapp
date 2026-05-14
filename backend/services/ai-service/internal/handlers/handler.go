package handlers

import (
	"context"
	"encoding/json"

	pkg_dto "ai-service/internal/pkg"
)

type Service interface {
	Generate(ctx context.Context, user *pkg_dto.UserContext, req pkg_dto.GenerateRequest) (*pkg_dto.GeneratedAppResponse, error)
	Get(user *pkg_dto.UserContext, id string) (*pkg_dto.GeneratedAppResponse, error)
	GetConfig(user *pkg_dto.UserContext, id string) (json.RawMessage, error)
}

type Handler struct {
	service Service
}

func NewHandler(s Service) *Handler {
	return &Handler{service: s}
}
