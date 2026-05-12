package handlers

import (
	"auth-service/internal/logger"
	pkg_dto "auth-service/internal/pkg"
)

type Service interface {
	Register(email, password, name, userAgent, ipAddress string) (*pkg_dto.TokenResponse, error)
	Login(email, password, userAgent, ipAddress string) (*pkg_dto.TokenResponse, error)
	Refresh(refreshToken, userAgent, ipAddress string) (*pkg_dto.TokenResponse, error)
	Logout(refreshToken string) error
	Me(accessToken string) (*pkg_dto.UserResponse, error)
	ValidateAccessToken(accessToken string) (*pkg_dto.ValidateResponse, error)
	ListUsers(adminAccessToken string, page, limit int, role, search string) (*pkg_dto.UserListResponse, error)
	GetUserByEmail(adminAccessToken, email string) (*pkg_dto.UserResponse, error)
	PromoteUser(adminAccessToken, email string) (*pkg_dto.UserResponse, error)
	SetUserActive(adminAccessToken, userID string, active bool) (*pkg_dto.UserResponse, error)
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
