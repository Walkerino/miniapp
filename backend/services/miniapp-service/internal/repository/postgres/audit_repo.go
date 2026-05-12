package postgres

import (
	"database/sql"

	"miniapp-service/internal/models"
)

type AuditRepository struct {
	db *sql.DB
}

func NewAuditRepository(databaseURL string) (*AuditRepository, error) {
	db, err := Open(databaseURL)
	if err != nil {
		return nil, err
	}
	return &AuditRepository{db: db}, nil
}

func (r *AuditRepository) Create(log *models.AuditLog) error {
	return r.db.QueryRow(
		`INSERT INTO audit_logs (actor_id, actor_role, actor_email, action, miniapp_id, miniapp_name, category)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`,
		log.ActorID,
		log.ActorRole,
		log.ActorEmail,
		log.Action,
		log.MiniappID,
		log.MiniappName,
		log.Category,
	).Scan(&log.ID, &log.CreatedAt)
}

func (r *AuditRepository) List(page, limit int) ([]models.AuditLog, int, error) {
	var total int
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM audit_logs`).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(
		`SELECT id, actor_id, actor_role, actor_email, action, miniapp_id, miniapp_name, category, created_at
		FROM audit_logs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`,
		limit,
		(page-1)*limit,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := []models.AuditLog{}
	for rows.Next() {
		var item models.AuditLog
		if err := rows.Scan(
			&item.ID,
			&item.ActorID,
			&item.ActorRole,
			&item.ActorEmail,
			&item.Action,
			&item.MiniappID,
			&item.MiniappName,
			&item.Category,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}
