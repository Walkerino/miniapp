package models

import (
	"time"

	"github.com/google/uuid"
)

type RefreshSession struct {
	ID               uuid.UUID  `db:"id"`
	UserID           uuid.UUID  `db:"user_id"`
	RefreshTokenHash string     `db:"refresh_token_hash"`
	UserAgent        *string    `db:"user_agent"`
	IPAddress        *string    `db:"ip_address"`
	ExpiresAt        time.Time  `db:"expires_at"`
	RevokedAt        *time.Time `db:"revoked_at"`
	CreatedAt        time.Time  `db:"created_at"`
}
