package pkg

import "time"

type TokenPair struct {
	AccessToken      string    `json:"access_token"`
	RefreshToken     string    `json:"refresh_token"`
	ExpiresAt        time.Time `json:"expires_at"`
	RefreshExpiresAt time.Time `json:"refresh_expires_at"`
}

type TokenResponse struct {
	AccessToken      string       `json:"access_token"`
	RefreshToken     string       `json:"-"`
	RefreshExpiresAt time.Time    `json:"-"`
	User             UserResponse `json:"user"`
}

type RegisterRequest struct {
	Email    string `json:"email" example:"test@mail.com"`
	Password string `json:"password" example:"qwerty123"`
	Name     string `json:"name" example:"Amir"`
}

type LoginRequest struct {
	Email    string `json:"email" example:"test@mail.com"`
	Password string `json:"password" example:"qwerty123"`
}

type UpdateNameRequest struct {
	Name string `json:"name" example:"Amir"`
}

type UpdateEmailRequest struct {
	Email           string `json:"email" example:"new@mail.com"`
	CurrentPassword string `json:"current_password" example:"qwerty123"`
}

type UpdatePasswordRequest struct {
	CurrentPassword string `json:"current_password" example:"qwerty123"`
	NewPassword     string `json:"new_password" example:"newpass123"`
}

type DeleteAccountRequest struct {
	CurrentPassword string `json:"current_password" example:"qwerty123"`
}

type ValidateResponse struct {
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	Name      *string   `json:"name,omitempty"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	ExpiresAt time.Time `json:"expires_at"`
}

type UserResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      *string   `json:"name"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UserListResponse struct {
	Items []UserResponse `json:"items"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
	Total int            `json:"total"`
}

type PromoteUserRequest struct {
	Email string `json:"email"`
}

type GetUserRequest struct {
	Email string `json:"email"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}
