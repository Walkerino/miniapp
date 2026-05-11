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

func (r *RefreshTokenRepository) Create(token *models.RefreshToken) error {
	_, err := r.db.Exec(`INSERT INTO refresh_tokens (id, token, expires_at, is_revoked, user_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		token.ID, token.Token, token.ExpiresAt, token.IsRevoked, token.UserID, token.CreatedAt,
	)
	return err
}

func (r *RefreshTokenRepository) GetByToken(token string) (*models.RefreshToken, error) {
	refreshToken := &models.RefreshToken{}

	err := r.db.QueryRow(`SELECT id, token, expires_at, is_revoked, user_id, created_at
		FROM refresh_tokens WHERE token=$1`, token,
	).Scan(
		&refreshToken.ID,
		&refreshToken.Token,
		&refreshToken.ExpiresAt,
		&refreshToken.IsRevoked,
		&refreshToken.UserID,
		&refreshToken.CreatedAt,
	)
	if err != nil {
		return nil, ErrRefreshTokenNotFound
	}

	return refreshToken, nil
}

func (r *RefreshTokenRepository) Revoke(token string) error {
	result, err := r.db.Exec("UPDATE refresh_tokens SET is_revoked=TRUE WHERE token=$1", token)
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
