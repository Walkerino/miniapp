package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type GeneratedApp struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	Prompt      string
	Title       string
	Description string
	Config      json.RawMessage
	Status      string
	MiniappID   *uuid.UUID
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
