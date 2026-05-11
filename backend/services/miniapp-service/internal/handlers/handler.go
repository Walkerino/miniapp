package handlers

import (
	pkg_dto "miniapp-service/internal/pkg"
)

type Service interface {
	ListActive(user *pkg_dto.UserContext, page, limit int, search string) (*pkg_dto.MiniappListResponse, error)
	Suggest(user *pkg_dto.UserContext, req pkg_dto.CreateMiniappRequest) (*pkg_dto.MiniappResponse, error)
	GetActive(user *pkg_dto.UserContext, id string) (*pkg_dto.MiniappResponse, error)
	Launch(user *pkg_dto.UserContext, id, userAgent, ipAddress string) (*pkg_dto.LaunchMiniappResponse, error)
	AddFavorite(user *pkg_dto.UserContext, id string) (*pkg_dto.FavoriteResponse, error)
	RemoveFavorite(user *pkg_dto.UserContext, id string) error
	ListFavorites(user *pkg_dto.UserContext, page, limit int) (*pkg_dto.MiniappListResponse, error)
	ListAll(user *pkg_dto.UserContext, page, limit int, status, search string) (*pkg_dto.MiniappListResponse, error)
	AdminCreate(user *pkg_dto.UserContext, req pkg_dto.AdminCreateMiniappRequest) (*pkg_dto.MiniappResponse, error)
	AdminGet(user *pkg_dto.UserContext, id string) (*pkg_dto.MiniappResponse, error)
	AdminUpdate(user *pkg_dto.UserContext, id string, req pkg_dto.UpdateMiniappRequest) (*pkg_dto.MiniappResponse, error)
	AdminDelete(user *pkg_dto.UserContext, id string) error
	SetStatus(user *pkg_dto.UserContext, id, status string) (*pkg_dto.MiniappResponse, error)
	Session(launchToken string) (*pkg_dto.MiniappSessionContext, error)
}

type Handler struct {
	service Service
}

func NewHandler(s Service) *Handler {
	return &Handler{service: s}
}
