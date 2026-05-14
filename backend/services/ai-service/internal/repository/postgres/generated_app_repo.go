package postgres

import (
	"database/sql"
	"encoding/json"
	"errors"

	"ai-service/internal/models"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("not found")

type GeneratedAppRepository struct {
	db *sql.DB
}

func NewGeneratedAppRepository(databaseURL string) (*GeneratedAppRepository, error) {
	db, err := Open(databaseURL)
	if err != nil {
		return nil, err
	}
	return &GeneratedAppRepository{db: db}, nil
}

func (r *GeneratedAppRepository) Close() error {
	return r.db.Close()
}

func (r *GeneratedAppRepository) Create(app *models.GeneratedApp) error {
	if app.ID == uuid.Nil {
		app.ID = uuid.New()
	}
	return r.db.QueryRow(
		`INSERT INTO generated_apps (id, user_id, prompt, title, description, config, status, miniapp_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at`,
		app.ID, app.UserID, app.Prompt, app.Title, app.Description, json.RawMessage(app.Config), app.Status, app.MiniappID,
	).Scan(&app.CreatedAt, &app.UpdatedAt)
}

func (r *GeneratedAppRepository) Get(id, userID uuid.UUID) (*models.GeneratedApp, error) {
	row := r.db.QueryRow(
		`SELECT id, user_id, prompt, title, description, config, status, miniapp_id, created_at, updated_at
		FROM generated_apps
		WHERE id=$1 AND user_id=$2`,
		id, userID,
	)
	return scanGeneratedApp(row)
}

func (r *GeneratedAppRepository) GetConfig(id, userID uuid.UUID) (json.RawMessage, error) {
	app, err := r.Get(id, userID)
	if err != nil {
		return nil, err
	}
	return app.Config, nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanGeneratedApp(row scanner) (*models.GeneratedApp, error) {
	item := &models.GeneratedApp{}
	err := row.Scan(
		&item.ID,
		&item.UserID,
		&item.Prompt,
		&item.Title,
		&item.Description,
		&item.Config,
		&item.Status,
		&item.MiniappID,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return item, err
}
