package postgres

import (
	"database/sql"
	"errors"
	"time"

	"miniapp-service/internal/models"

	"github.com/google/uuid"
)

type LaunchRepository struct {
	db *sql.DB
}

func NewLaunchRepository(databaseURL string) (*LaunchRepository, error) {
	db, err := Open(databaseURL)
	if err != nil {
		return nil, err
	}
	return &LaunchRepository{db: db}, nil
}

func (r *LaunchRepository) Close() error {
	return r.db.Close()
}

func (r *LaunchRepository) CreateToken(token *models.LaunchToken) error {
	return r.db.QueryRow(
		`INSERT INTO miniapp_launch_tokens
		    (id, miniapp_id, user_id, user_email, user_name, user_role, token_hash, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at`,
		token.ID, token.MiniappID, token.UserID, token.UserEmail, token.UserName, token.UserRole, token.TokenHash, token.ExpiresAt, token.CreatedAt,
	).Scan(&token.CreatedAt)
}

func (r *LaunchRepository) CreateLaunch(miniappID, userID uuid.UUID, userAgent, ipAddress string) error {
	_, err := r.db.Exec(
		`INSERT INTO miniapp_launches (id, miniapp_id, user_id, user_agent, ip_address, launched_at)
		VALUES ($1, $2, $3, $4, $5, now())`,
		uuid.New(), miniappID, userID, nullableString(userAgent), nullableString(ipAddress),
	)
	return err
}

func (r *LaunchRepository) GetSession(tokenHash string) (*models.LaunchToken, string, error) {
	token := &models.LaunchToken{}
	var miniappTitle string
	err := r.db.QueryRow(
		`SELECT lt.id, lt.miniapp_id, lt.user_id, lt.user_email, lt.user_name, lt.user_role,
		       lt.token_hash, lt.expires_at, lt.used_at, lt.created_at, m.title
		FROM miniapp_launch_tokens lt
		JOIN miniapps m ON m.id=lt.miniapp_id
		WHERE lt.token_hash=$1 AND m.status='active'`,
		tokenHash,
	).Scan(
		&token.ID,
		&token.MiniappID,
		&token.UserID,
		&token.UserEmail,
		&token.UserName,
		&token.UserRole,
		&token.TokenHash,
		&token.ExpiresAt,
		&token.UsedAt,
		&token.CreatedAt,
		&miniappTitle,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, "", ErrNotFound
	}
	if err != nil {
		return nil, "", err
	}
	if time.Now().UTC().After(token.ExpiresAt) {
		return nil, "", ErrNotFound
	}
	return token, miniappTitle, nil
}

func nullableString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
