package utils

import (
	"errors"
	"time"

	pkg_dto "auth-service/internal/pkg"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

type JWTService struct {
	secret          []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

type AccessClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func NewJWTService(secret string, accessTTL, refreshTTL time.Duration) *JWTService {
	return &JWTService{
		secret:          []byte(secret),
		accessTokenTTL:  accessTTL,
		refreshTokenTTL: refreshTTL,
	}
}

func (s *JWTService) Generate(userID, email string) (*pkg_dto.TokenPair, error) {
	now := time.Now()

	claims := AccessClaims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
	if err != nil {
		return nil, err
	}

	return &pkg_dto.TokenPair{
		AccessToken:      accessToken,
		RefreshToken:     uuid.NewString(),
		ExpiresAt:        claims.ExpiresAt.Time,
		RefreshExpiresAt: now.Add(s.refreshTokenTTL),
	}, nil
}

func (s *JWTService) Validate(tokenString string) (*AccessClaims, error) {
	claims := &AccessClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}

		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.ExpiresAt == nil {
		return nil, errors.New("missing expiration")
	}

	return claims, nil
}
