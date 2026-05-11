package models

import (
	"time"

	"github.com/google/uuid"
)

type Miniapp struct {
	ID            uuid.UUID
	Title         string
	Description   *string
	URL           string
	Status        string
	CreatedBy     uuid.UUID
	UpdatedBy     *uuid.UUID
	LaunchesCount int
	IsFavorite    bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type LaunchToken struct {
	ID        uuid.UUID
	MiniappID uuid.UUID
	UserID    uuid.UUID
	UserEmail string
	UserName  *string
	UserRole  string
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
	CreatedAt time.Time
}
