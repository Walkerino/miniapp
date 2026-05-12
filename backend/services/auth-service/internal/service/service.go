package service

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
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
	ErrInactiveUser        = errors.New("user is inactive")
	ErrForbidden           = errors.New("forbidden")
	ErrUserNotFound        = errors.New("user not found")
	ErrInvalidRole         = errors.New("invalid role")
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
	Create(session *models.RefreshSession) error
	GetByHash(tokenHash string) (*models.RefreshSession, error)
	RevokeByHash(tokenHash string) error
}

type UserRepository interface {
	Create(user *models.User) error
	GetUser(email string) (*models.User, error)
	ExistsByEmail(email string) (bool, error)
	GetUserByID(id string) (*models.User, error)
	List(page, limit int, role, search string) ([]models.User, int, error)
	SetRoleByEmail(email, role string) (*models.User, error)
	SetActive(id string, active bool) (*models.User, error)
}

type AdminActionRepository interface {
	Create(adminID uuid.UUID, action string, targetUserID *uuid.UUID, metadata string) error
}

type Service struct {
	hasher      PasswordHasher
	jwt         TokenService
	tokensRepo  RefreshTokenRepository
	usersRepo   UserRepository
	actionsRepo AdminActionRepository
}

func NewService(hasher PasswordHasher, jwt TokenService, tokensRepo RefreshTokenRepository, usersRepo UserRepository, actionsRepo AdminActionRepository) *Service {
	return &Service{
		hasher:      hasher,
		jwt:         jwt,
		tokensRepo:  tokensRepo,
		usersRepo:   usersRepo,
		actionsRepo: actionsRepo,
	}
}

func (s *Service) Register(email, password, name, userAgent, ipAddress string) (*pkg_dto.TokenResponse, error) {
	email = normalizeEmail(email)
	name = strings.TrimSpace(name)

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

	now := time.Now().UTC()
	user := &models.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hash,
		Name:         nullableString(name),
		Role:         "user",
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.usersRepo.Create(user); err != nil {
		return nil, err
	}

	return s.issueTokens(user, userAgent, ipAddress)
}

func (s *Service) Login(email, password, userAgent, ipAddress string) (*pkg_dto.TokenResponse, error) {
	email = normalizeEmail(email)

	user, err := s.usersRepo.GetUser(email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if !user.IsActive {
		return nil, ErrInactiveUser
	}
	if ok := s.hasher.Compare(password, user.PasswordHash); !ok {
		return nil, ErrInvalidCredentials
	}

	return s.issueTokens(user, userAgent, ipAddress)
}

func (s *Service) Refresh(refreshToken, userAgent, ipAddress string) (*pkg_dto.TokenResponse, error) {
	session, err := s.tokensRepo.GetByHash(hashToken(refreshToken))
	if err != nil {
		return nil, ErrInvalidRefreshToken
	}
	if session.RevokedAt != nil || time.Now().UTC().After(session.ExpiresAt) {
		return nil, ErrInvalidRefreshToken
	}

	user, err := s.usersRepo.GetUserByID(session.UserID.String())
	if err != nil {
		return nil, ErrInvalidRefreshToken
	}
	if !user.IsActive {
		return nil, ErrInactiveUser
	}

	if err := s.tokensRepo.RevokeByHash(hashToken(refreshToken)); err != nil {
		return nil, err
	}

	return s.issueTokens(user, userAgent, ipAddress)
}

func (s *Service) Logout(refreshToken string) error {
	if strings.TrimSpace(refreshToken) == "" {
		return ErrInvalidRefreshToken
	}
	return s.tokensRepo.RevokeByHash(hashToken(refreshToken))
}

func (s *Service) Me(accessToken string) (*pkg_dto.UserResponse, error) {
	claims, err := s.jwt.Validate(strings.TrimSpace(accessToken))
	if err != nil {
		return nil, err
	}

	user, err := s.usersRepo.GetUserByID(claims.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}
	if !user.IsActive {
		return nil, ErrInactiveUser
	}

	resp := userResponse(user)
	return &resp, nil
}

func (s *Service) ValidateAccessToken(accessToken string) (*pkg_dto.ValidateResponse, error) {
	claims, err := s.jwt.Validate(strings.TrimSpace(accessToken))
	if err != nil {
		return nil, err
	}

	user, err := s.usersRepo.GetUserByID(claims.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}
	if !user.IsActive {
		return nil, ErrInactiveUser
	}

	return &pkg_dto.ValidateResponse{
		UserID:    user.ID.String(),
		Email:     user.Email,
		Name:      user.Name,
		Role:      user.Role,
		IsActive:  user.IsActive,
		ExpiresAt: claims.ExpiresAt.Time,
	}, nil
}

func (s *Service) ListUsers(adminAccessToken string, page, limit int, role, search string) (*pkg_dto.UserListResponse, error) {
	if err := s.requireAdmin(adminAccessToken); err != nil {
		return nil, err
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if role != "" && role != "user" && role != "admin" {
		return nil, ErrInvalidRole
	}

	users, total, err := s.usersRepo.List(page, limit, role, strings.TrimSpace(search))
	if err != nil {
		return nil, err
	}

	items := make([]pkg_dto.UserResponse, 0, len(users))
	for i := range users {
		items = append(items, userResponse(&users[i]))
	}

	return &pkg_dto.UserListResponse{
		Items: items,
		Page:  page,
		Limit: limit,
		Total: total,
	}, nil
}

func (s *Service) GetUserByEmail(adminAccessToken, email string) (*pkg_dto.UserResponse, error) {
	if err := s.requireAdmin(adminAccessToken); err != nil {
		return nil, err
	}

	user, err := s.usersRepo.GetUser(normalizeEmail(email))
	if err != nil {
		return nil, ErrUserNotFound
	}

	resp := userResponse(user)
	return &resp, nil
}

func (s *Service) PromoteUser(adminAccessToken, email string) (*pkg_dto.UserResponse, error) {
	admin, err := s.adminUser(adminAccessToken)
	if err != nil {
		return nil, err
	}

	user, err := s.usersRepo.SetRoleByEmail(normalizeEmail(email), "admin")
	if err != nil {
		return nil, ErrUserNotFound
	}
	_ = s.actionsRepo.Create(admin.ID, "promote_user", &user.ID, fmt.Sprintf(`{"email":%q}`, user.Email))

	resp := userResponse(user)
	return &resp, nil
}

func (s *Service) SetUserActive(adminAccessToken, userID string, active bool) (*pkg_dto.UserResponse, error) {
	admin, err := s.adminUser(adminAccessToken)
	if err != nil {
		return nil, err
	}

	user, err := s.usersRepo.SetActive(userID, active)
	if err != nil {
		return nil, ErrUserNotFound
	}

	action := "activate_user"
	if !active {
		action = "deactivate_user"
	}
	_ = s.actionsRepo.Create(admin.ID, action, &user.ID, fmt.Sprintf(`{"is_active":%t}`, active))

	resp := userResponse(user)
	return &resp, nil
}

func (s *Service) issueTokens(user *models.User, userAgent, ipAddress string) (*pkg_dto.TokenResponse, error) {
	tokens, err := s.jwt.Generate(user.ID.String(), user.Email)
	if err != nil {
		return nil, err
	}

	session := &models.RefreshSession{
		ID:               uuid.New(),
		UserID:           user.ID,
		RefreshTokenHash: hashToken(tokens.RefreshToken),
		UserAgent:        nullableString(userAgent),
		IPAddress:        nullableString(ipAddress),
		ExpiresAt:        tokens.RefreshExpiresAt,
		CreatedAt:        time.Now().UTC(),
	}

	if err := s.tokensRepo.Create(session); err != nil {
		return nil, err
	}

	return &pkg_dto.TokenResponse{
		AccessToken:      tokens.AccessToken,
		RefreshToken:     tokens.RefreshToken,
		RefreshExpiresAt: tokens.RefreshExpiresAt,
		User:             userResponse(user),
	}, nil
}

func (s *Service) requireAdmin(accessToken string) error {
	_, err := s.adminUser(accessToken)
	return err
}

func (s *Service) adminUser(accessToken string) (*models.User, error) {
	claims, err := s.jwt.Validate(strings.TrimSpace(accessToken))
	if err != nil {
		return nil, err
	}

	user, err := s.usersRepo.GetUserByID(claims.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}
	if !user.IsActive {
		return nil, ErrInactiveUser
	}
	if user.Role != "admin" {
		return nil, ErrForbidden
	}

	return user, nil
}

func userResponse(user *models.User) pkg_dto.UserResponse {
	return pkg_dto.UserResponse{
		ID:        user.ID.String(),
		Email:     user.Email,
		Name:      user.Name,
		Role:      user.Role,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(token)))
	return hex.EncodeToString(sum[:])
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func nullableString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}
