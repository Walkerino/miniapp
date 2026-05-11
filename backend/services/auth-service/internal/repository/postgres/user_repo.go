package postgres

import (
	"auth-service/internal/models"
	"database/sql"
	"errors"
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
		"INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)",
		user.ID, user.Email, user.PasswordHash, user.CreatedAt,
	)
	if err != nil {
		return ErrUserCreate
	}
	return nil
}

func (r *UserRepository) GetUser(email string) (*models.User, error) {
	var user *models.User = &models.User{}

	err := r.db.QueryRow(
		"SELECT id, email, password_hash, created_at FROM users WHERE email=$1", email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)

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
		"SELECT id, email, password_hash, created_at FROM users WHERE id=$1", id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return nil, ErrUserNotFound
	}

	return user, nil
}
