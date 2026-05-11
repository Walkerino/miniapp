package service

import (
	"errors"
	"strings"
	"time"

	"auth-service/internal/models"
	pkg_dto "auth-service/internal/pkg"
	"auth-service/internal/utils"

	"github.com/google/uuid"
)

var (
	ErrInvalidCredentials  = errors.New("invalid email or password")
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
	ErrEmailAlreadyExists  = errors.New("email already registered")
)

type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(password, hash string) bool
}

type TokenService interface {
	Generate(userID, email string) (*pkg_dto.TokenPair, error)
	Validate(tokenString string) (*utils.AccessClaims, error)
}

type RefreshTokenRepository interface {
	Create(token *models.RefreshToken) error
	GetByToken(token string) (*models.RefreshToken, error)
	Revoke(token string) error
}

type UserRepository interface {
	Create(user *models.User) error
	GetUser(email string) (*models.User, error)
	ExistsByEmail(email string) (bool, error)
	GetUserByID(id string) (*models.User, error)
}

type Service struct {
	hasher     PasswordHasher
	jwt        TokenService
	tokensRepo RefreshTokenRepository
	usersRepo  UserRepository
}

func NewService(hasher PasswordHasher, jwt TokenService, tokensRepo RefreshTokenRepository, usersRepo UserRepository) *Service {
	return &Service{
		hasher:     hasher,
		jwt:        jwt,
		tokensRepo: tokensRepo,
		usersRepo:  usersRepo,
	}
}

func (s *Service) Register(email, password string) (*pkg_dto.TokenResponse, error) {
	email = normalizeEmail(email)

	exists, err := s.usersRepo.ExistsByEmail(email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrEmailAlreadyExists
	}

	hash, err := s.hasher.Hash(password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hash,
		CreatedAt:    time.Now().UTC(),
	}

	if err := s.usersRepo.Create(user); err != nil {
		return nil, err
	}

	tokens, err := s.jwt.Generate(
		user.ID.String(),
		user.Email,
	)
	if err != nil {
		return nil, err
	}

	rt := &models.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		Token:     tokens.RefreshToken,
		ExpiresAt: tokens.RefreshExpiresAt,
		CreatedAt: time.Now().UTC(),
		IsRevoked: false,
	}

	if err := s.tokensRepo.Create(rt); err != nil {
		return nil, err
	}

	return &pkg_dto.TokenResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt,
	}, nil
}

func (s *Service) Login(email, password string) (*pkg_dto.TokenResponse, error) {
	email = normalizeEmail(email)

	user, err := s.usersRepo.GetUser(email)
	if err != nil {
		return nil, err
	}

	if ok := s.hasher.Compare(password, user.PasswordHash); !ok {
		return nil, ErrInvalidCredentials
	}

	tokens, err := s.jwt.Generate(
		user.ID.String(),
		user.Email,
	)

	if err != nil {
		return nil, err
	}

	rt := &models.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		Token:     tokens.RefreshToken,
		ExpiresAt: tokens.RefreshExpiresAt,
		CreatedAt: time.Now().UTC(),
		IsRevoked: false,
	}

	if err := s.tokensRepo.Create(rt); err != nil {
		return nil, err
	}

	return &pkg_dto.TokenResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt,
	}, nil
}

func (s *Service) Refresh(refreshToken string) (*pkg_dto.TokenResponse, error) {
	storedToken, err := s.tokensRepo.GetByToken(refreshToken)
	if err != nil {
		return nil, ErrInvalidRefreshToken
	}
	if storedToken.IsRevoked || time.Now().UTC().After(storedToken.ExpiresAt) {
		return nil, ErrInvalidRefreshToken
	}

	user, err := s.usersRepo.GetUserByID(storedToken.UserID.String())
	if err != nil {
		return nil, err
	}

	tokens, err := s.jwt.Generate(user.ID.String(), user.Email)
	if err != nil {
		return nil, err
	}

	if err := s.tokensRepo.Revoke(refreshToken); err != nil {
		return nil, err
	}

	rt := &models.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		Token:     tokens.RefreshToken,
		ExpiresAt: tokens.RefreshExpiresAt,
		CreatedAt: time.Now().UTC(),
		IsRevoked: false,
	}
	if err := s.tokensRepo.Create(rt); err != nil {
		return nil, err
	}

	return &pkg_dto.TokenResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt,
	}, nil
}

func (s *Service) ValidateAccessToken(accessToken string) (*pkg_dto.ValidateResponse, error) {
	claims, err := s.jwt.Validate(strings.TrimSpace(accessToken))
	if err != nil {
		return nil, err
	}

	return &pkg_dto.ValidateResponse{
		UserID:    claims.UserID,
		Email:     claims.Email,
		ExpiresAt: claims.ExpiresAt.Time,
	}, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
