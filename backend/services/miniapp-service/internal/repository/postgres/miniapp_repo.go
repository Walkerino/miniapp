package postgres

import (
	"database/sql"
	"errors"
	"strconv"
	"strings"
	"time"

	"miniapp-service/internal/models"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("not found")

type MiniappRepository struct {
	db *sql.DB
}

func NewMiniappRepository(databaseURL string) (*MiniappRepository, error) {
	db, err := Open(databaseURL)
	if err != nil {
		return nil, err
	}
	return &MiniappRepository{db: db}, nil
}

func (r *MiniappRepository) Close() error {
	return r.db.Close()
}

func (r *MiniappRepository) List(userID uuid.UUID, page, limit int, status, search string, includeDeleted bool) ([]models.Miniapp, int, error) {
	where := []string{"1=1"}
	args := []any{}
	if status != "" {
		args = append(args, status)
		where = append(where, "m.status=$"+strconv.Itoa(len(args)))
	} else if !includeDeleted {
		where = append(where, "m.status <> 'deleted'")
	}
	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		where = append(where, "(LOWER(m.title) LIKE $"+strconv.Itoa(len(args))+" OR LOWER(COALESCE(m.description, '')) LIKE $"+strconv.Itoa(len(args))+")")
	}
	return r.listWhere(userID, page, limit, strings.Join(where, " AND "), args...)
}

func (r *MiniappRepository) ListFavorites(userID uuid.UUID, page, limit int) ([]models.Miniapp, int, error) {
	where := "m.status='active' AND EXISTS (SELECT 1 FROM user_favorites uf WHERE uf.user_id=$1 AND uf.miniapp_id=m.id)"
	return r.listWhere(userID, page, limit, where, userID)
}

func (r *MiniappRepository) listWhere(userID uuid.UUID, page, limit int, whereSQL string, args ...any) ([]models.Miniapp, int, error) {
	var total int
	if err := r.db.QueryRow("SELECT COUNT(*) FROM miniapps m WHERE "+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, userID, limit, (page-1)*limit)
	userParam := len(args) - 2
	limitParam := len(args) - 1
	offsetParam := len(args)
	rows, err := r.db.Query(
		`SELECT m.id, m.title, m.description, m.url, m.status, m.reject_reason, m.created_by, m.updated_by,
		       COALESCE(l.launches_count, 0) AS launches_count,
		       EXISTS (SELECT 1 FROM user_favorites uf WHERE uf.user_id=$`+strconv.Itoa(userParam)+` AND uf.miniapp_id=m.id) AS is_favorite,
		       m.created_at, m.updated_at
		FROM miniapps m
		LEFT JOIN (
			SELECT miniapp_id, COUNT(*) AS launches_count
			FROM miniapp_launches
			GROUP BY miniapp_id
		) l ON l.miniapp_id=m.id
		WHERE `+whereSQL+`
		ORDER BY m.created_at DESC
		LIMIT $`+strconv.Itoa(limitParam)+` OFFSET $`+strconv.Itoa(offsetParam),
		args...,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := []models.Miniapp{}
	for rows.Next() {
		item, err := scanMiniapp(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *item)
	}
	return items, total, rows.Err()
}

func (r *MiniappRepository) Create(app *models.Miniapp) error {
	return r.db.QueryRow(
		`INSERT INTO miniapps (id, title, description, url, status, reject_reason, created_by, updated_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING created_at, updated_at`,
		app.ID, app.Title, app.Description, app.URL, app.Status, app.RejectReason, app.CreatedBy, app.UpdatedBy, app.CreatedAt, app.UpdatedAt,
	).Scan(&app.CreatedAt, &app.UpdatedAt)
}

func (r *MiniappRepository) Get(id, userID uuid.UUID) (*models.Miniapp, error) {
	row := r.db.QueryRow(
		`SELECT m.id, m.title, m.description, m.url, m.status, m.reject_reason, m.created_by, m.updated_by,
		       COALESCE(l.launches_count, 0),
		       EXISTS (SELECT 1 FROM user_favorites uf WHERE uf.user_id=$2 AND uf.miniapp_id=m.id),
		       m.created_at, m.updated_at
		FROM miniapps m
		LEFT JOIN (
			SELECT miniapp_id, COUNT(*) AS launches_count
			FROM miniapp_launches
			GROUP BY miniapp_id
		) l ON l.miniapp_id=m.id
		WHERE m.id=$1`,
		id, userID,
	)
	return scanMiniapp(row)
}

func (r *MiniappRepository) Update(app *models.Miniapp) error {
	err := r.db.QueryRow(
		`UPDATE miniapps
		SET title=$2, description=$3, url=$4, status=$5, reject_reason=$6, updated_by=$7, updated_at=now()
		WHERE id=$1
		RETURNING updated_at`,
		app.ID, app.Title, app.Description, app.URL, app.Status, app.RejectReason, app.UpdatedBy,
	).Scan(&app.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *MiniappRepository) SetStatus(id, userID uuid.UUID, status string) (*models.Miniapp, error) {
	return r.SetStatusReason(id, userID, status, nil)
}

func (r *MiniappRepository) SetStatusReason(id, userID uuid.UUID, status string, rejectReason *string) (*models.Miniapp, error) {
	var updatedAt time.Time
	err := r.db.QueryRow(
		`UPDATE miniapps SET status=$2, reject_reason=$3, updated_by=$4, updated_at=now()
		WHERE id=$1 RETURNING updated_at`,
		id, status, rejectReason, userID,
	).Scan(&updatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return r.Get(id, userID)
}

func (r *MiniappRepository) Metrics() (*models.AdminMetrics, error) {
	metrics := &models.AdminMetrics{}
	err := r.db.QueryRow(
		`SELECT
			COUNT(*) FILTER (WHERE status <> 'deleted') AS total_miniapps,
			COUNT(*) FILTER (WHERE status = 'active') AS active_miniapps,
			COUNT(*) FILTER (WHERE status = 'pending') AS pending_miniapps,
			COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_miniapps
		FROM miniapps`,
	).Scan(
		&metrics.TotalMiniapps,
		&metrics.ActiveMiniapps,
		&metrics.PendingMiniapps,
		&metrics.RejectedMiniapps,
	)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(
		`SELECT
			COUNT(*) AS total_launches,
			COUNT(*) FILTER (WHERE launched_at >= date_trunc('day', now())) AS launches_today,
			COUNT(*) FILTER (WHERE launched_at >= date_trunc('week', now())) AS launches_this_week
		FROM miniapp_launches`,
	).Scan(
		&metrics.TotalLaunches,
		&metrics.LaunchesToday,
		&metrics.LaunchesThisWeek,
	)
	if err != nil {
		return nil, err
	}

	return metrics, nil
}

func (r *MiniappRepository) AddFavorite(userID, miniappID uuid.UUID) (time.Time, error) {
	var createdAt time.Time
	err := r.db.QueryRow(
		`INSERT INTO user_favorites (user_id, miniapp_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, miniapp_id) DO UPDATE SET created_at=user_favorites.created_at
		RETURNING created_at`,
		userID, miniappID,
	).Scan(&createdAt)
	return createdAt, err
}

func (r *MiniappRepository) RemoveFavorite(userID, miniappID uuid.UUID) error {
	result, err := r.db.Exec(`DELETE FROM user_favorites WHERE user_id=$1 AND miniapp_id=$2`, userID, miniappID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanMiniapp(row scanner) (*models.Miniapp, error) {
	item := &models.Miniapp{}
	err := row.Scan(
		&item.ID,
		&item.Title,
		&item.Description,
		&item.URL,
		&item.Status,
		&item.RejectReason,
		&item.CreatedBy,
		&item.UpdatedBy,
		&item.LaunchesCount,
		&item.IsFavorite,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return item, err
}
