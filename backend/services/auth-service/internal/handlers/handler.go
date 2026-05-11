package handlers

import (
	"auth-service/internal/logger"
	pkg_dto "auth-service/internal/pkg"
)

type Service interface {
	Register(email, password string) (*pkg_dto.TokenResponse, error)
	Login(email, password string) (*pkg_dto.TokenResponse, error)
	Refresh(refreshToken string) (*pkg_dto.TokenResponse, error)
	ValidateAccessToken(accessToken string) (*pkg_dto.ValidateResponse, error)
}

type Handler struct {
	service Service
	log     *logger.Log
}

func NewHandler(log *logger.Log, s Service) *Handler {
	return &Handler{
		log:     log,
		service: s,
	}
}
