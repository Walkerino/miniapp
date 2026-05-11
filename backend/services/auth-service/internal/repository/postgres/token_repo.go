package postgres

import (
	"auth-service/internal/models"
	"database/sql"
	"errors"
)

var ErrRefreshTokenNotFound = errors.New("refresh token not found")

type RefreshTokenRepository struct {
	db *sql.DB
}

func NewRefreshTokenRepository(tokendbURL string) (*RefreshTokenRepository, error) {
	db, err := sql.Open("postgres", tokendbURL)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &RefreshTokenRepository{db: db}, nil
}

func (r *RefreshTokenRepository) Create(session *models.RefreshSession) error {
	_, err := r.db.Exec(`INSERT INTO refresh_sessions
		(id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		session.ID,
		session.UserID,
		session.RefreshTokenHash,
		session.UserAgent,
		session.IPAddress,
		session.ExpiresAt,
		session.RevokedAt,
		session.CreatedAt,
	)
	return err
}

func (r *RefreshTokenRepository) GetByHash(tokenHash string) (*models.RefreshSession, error) {
	session := &models.RefreshSession{}

	err := r.db.QueryRow(`SELECT id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, created_at
		FROM refresh_sessions WHERE refresh_token_hash=$1`, tokenHash,
	).Scan(
		&session.ID,
		&session.UserID,
		&session.RefreshTokenHash,
		&session.UserAgent,
		&session.IPAddress,
		&session.ExpiresAt,
		&session.RevokedAt,
		&session.CreatedAt,
	)
	if err != nil {
		return nil, ErrRefreshTokenNotFound
	}

	return session, nil
}

func (r *RefreshTokenRepository) RevokeByHash(tokenHash string) error {
	result, err := r.db.Exec("UPDATE refresh_sessions SET revoked_at=now() WHERE refresh_token_hash=$1 AND revoked_at IS NULL", tokenHash)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrRefreshTokenNotFound
	}

	return nil
}
