package postgres

import (
	"auth-service/internal/models"
	"database/sql"
	"errors"
	"strconv"
	"strings"
)

var ErrUserCreate = errors.New("failed to create user")
var ErrUserNotFound = errors.New("failed to find user")

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(userdbURL string) (*UserRepository, error) {
	db, err := sql.Open("postgres", userdbURL)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &UserRepository{db: db}, nil
}

func (r *UserRepository) Close() error {
	return r.db.Close()
}

func (r *UserRepository) Create(user *models.User) error {
	_, err := r.db.Exec(
		`INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		user.ID, user.Email, user.PasswordHash, user.Name, user.Role, user.IsActive, user.CreatedAt, user.UpdatedAt,
	)
	if err != nil {
		return ErrUserCreate
	}
	return nil
}

func (r *UserRepository) GetUser(email string) (*models.User, error) {
	var user *models.User = &models.User{}

	err := r.db.QueryRow(
		`SELECT id, email, password_hash, name, role, is_active, created_at, updated_at
		FROM users WHERE email=$1`, email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, ErrUserNotFound
	}

	return user, nil
}

func (r *UserRepository) ExistsByEmail(email string) (bool, error) {
	var exists bool

	err := r.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)", email).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

func (r *UserRepository) GetUserByID(id string) (*models.User, error) {
	user := &models.User{}

	err := r.db.QueryRow(
		`SELECT id, email, password_hash, name, role, is_active, created_at, updated_at
		FROM users WHERE id=$1`, id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, ErrUserNotFound
	}

	return user, nil
}

func (r *UserRepository) List(page, limit int, role, search string) ([]models.User, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	where := []string{"1=1"}
	args := []any{}
	if role != "" {
		args = append(args, role)
		where = append(where, "role=$"+strconv.Itoa(len(args)))
	}
	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		where = append(where, "(LOWER(email) LIKE $"+strconv.Itoa(len(args))+" OR LOWER(COALESCE(name, '')) LIKE $"+strconv.Itoa(len(args))+")")
	}

	whereSQL := strings.Join(where, " AND ")
	var total int
	if err := r.db.QueryRow("SELECT COUNT(*) FROM users WHERE "+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, (page-1)*limit)
	rows, err := r.db.Query(
		`SELECT id, email, password_hash, name, role, is_active, created_at, updated_at
		FROM users WHERE `+whereSQL+`
		ORDER BY created_at DESC
		LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)),
		args...,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt); err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}

	return users, total, rows.Err()
}

func (r *UserRepository) SetRoleByEmail(email, role string) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(
		`UPDATE users SET role=$2, updated_at=now()
		WHERE email=$1
		RETURNING id, email, password_hash, name, role, is_active, created_at, updated_at`,
		email, role,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, ErrUserNotFound
	}

	return user, nil
}

func (r *UserRepository) SetActive(id string, active bool) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(
		`UPDATE users SET is_active=$2, updated_at=now()
		WHERE id=$1
		RETURNING id, email, password_hash, name, role, is_active, created_at, updated_at`,
		id, active,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, ErrUserNotFound
	}

	return user, nil
}
