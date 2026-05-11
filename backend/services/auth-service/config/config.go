package config

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const defaultEnvPath = ".env"

type Config struct {
	Server ServerConfig
	DB     DBConfig
	JWT    JWTConfig
	Bcrypt BcryptConfig
}

type ServerConfig struct {
	Addr                    string
	GracefulShutdownTimeout time.Duration
}

type DBConfig struct {
	UserURL  string
	TokenURL string
}

type JWTConfig struct {
	Secret     string
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

type BcryptConfig struct {
	Cost int
}

func Load() (*Config, error) {
	if err := LoadDotEnv(defaultEnvPath); err != nil {
		return nil, err
	}

	userDBURL := getEnv("USER_DB_URL", "postgres://postgres:postgres@localhost:5432/auth?sslmode=disable")
	tokenDBURL := getEnv("TOKEN_DB_URL", userDBURL)

	cfg := &Config{
		Server: ServerConfig{
			Addr:                    getEnv("SERVER_ADDR", ":8080"),
			GracefulShutdownTimeout: getDurationEnv("GRACEFUL_SHUTDOWN_TIMEOUT", 10*time.Second),
		},
		DB: DBConfig{
			UserURL:  userDBURL,
			TokenURL: tokenDBURL,
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "secret"),
			AccessTTL:  getDurationEnv("JWT_ACCESS_TTL", time.Hour),
			RefreshTTL: getDurationEnv("JWT_REFRESH_TTL", 30*24*time.Hour),
		},
		Bcrypt: BcryptConfig{
			Cost: getIntEnv("BCRYPT_COST", 12),
		},
	}

	if cfg.Bcrypt.Cost < 4 {
		return nil, errors.New("BCRYPT_COST must be at least 4")
	}

	return cfg, nil
}

func LoadDotEnv(path string) error {
	file, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	lineNumber := 0
	for scanner.Scan() {
		lineNumber++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(strings.TrimPrefix(line, "export "), "=")
		if !ok {
			return fmt.Errorf("%s:%d: expected KEY=VALUE", path, lineNumber)
		}

		key = strings.TrimSpace(key)
		value = cleanEnvValue(value)
		if key == "" {
			return fmt.Errorf("%s:%d: empty env key", path, lineNumber)
		}
		if _, exists := os.LookupEnv(key); exists {
			continue
		}

		if err := os.Setenv(key, value); err != nil {
			return fmt.Errorf("%s:%d: set %s: %w", path, lineNumber, key, err)
		}
	}

	return scanner.Err()
}

func cleanEnvValue(value string) string {
	value = strings.TrimSpace(value)
	if len(value) >= 2 {
		quote := value[0]
		if (quote == '\'' || quote == '"') && value[len(value)-1] == quote {
			return value[1 : len(value)-1]
		}
	}

	if before, _, ok := strings.Cut(value, " #"); ok {
		return strings.TrimSpace(before)
	}

	return value
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func getIntEnv(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	if duration, err := time.ParseDuration(value); err == nil && duration > 0 {
		return duration
	}

	seconds, err := strconv.Atoi(value)
	if err != nil || seconds <= 0 {
		return fallback
	}

	return time.Duration(seconds) * time.Second
}
