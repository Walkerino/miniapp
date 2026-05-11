package postgres

import (
	"database/sql"

	"github.com/google/uuid"
)

type AdminActionRepository struct {
	db *sql.DB
}

func NewAdminActionRepository(dbURL string) (*AdminActionRepository, error) {
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &AdminActionRepository{db: db}, nil
}

func (r *AdminActionRepository) Create(adminID uuid.UUID, action string, targetUserID *uuid.UUID, metadata string) error {
	_, err := r.db.Exec(
		`INSERT INTO admin_actions (admin_id, action, target_user_id, metadata)
		VALUES ($1, $2, $3, $4::jsonb)`,
		adminID,
		action,
		targetUserID,
		metadata,
	)
	return err
}
