package pkg

import "time"

type TokenPair struct {
	AccessToken      string    `json:"access_token"`
	RefreshToken     string    `json:"refresh_token"`
	ExpiresAt        time.Time `json:"expires_at"`
	RefreshExpiresAt time.Time `json:"refresh_expires_at"`
}

type TokenResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
}

type RegisterRequest struct {
	Email    string `json:"email" example:"test@mail.com"`
	Password string `json:"password" example:"qwerty123"`
}

type LoginRequest struct {
	Email    string `json:"email" example:"test@mail.com"`
	Password string `json:"password" example:"qwerty123"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type ValidateResponse struct {
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	ExpiresAt time.Time `json:"expires_at"`
}
