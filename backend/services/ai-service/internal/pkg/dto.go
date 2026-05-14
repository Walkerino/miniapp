package pkg

import (
	"encoding/json"
	"time"
)

type UserContext struct {
	ID    string
	Email string
	Name  *string
	Role  string
}

type GenerateRequest struct {
	Prompt string `json:"prompt"`
}

type GeneratedAppResponse struct {
	GeneratedAppID string          `json:"generated_app_id"`
	MiniappID      *string         `json:"miniapp_id"`
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	URL            string          `json:"url"`
	Config         json.RawMessage `json:"config"`
	Status         string          `json:"status"`
	CreatedAt      time.Time       `json:"created_at,omitempty"`
	UpdatedAt      time.Time       `json:"updated_at,omitempty"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}
