package config

import (
	"bufio"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const defaultEnvPath = ".env"

type Config struct {
	Server     ServerConfig
	DB         DBConfig
	LLM        LLMConfig
	MiniappURL string
}

type ServerConfig struct {
	Addr                    string
	GracefulShutdownTimeout time.Duration
}

type DBConfig struct {
	URL string
}

type LLMConfig struct {
	BaseURL     string
	APIKey      string
	Model       string
	Timeout     time.Duration
	MaxTokens   int
	Temperature float64
}

func Load() (*Config, error) {
	if err := LoadDotEnv(defaultEnvPath); err != nil {
		return nil, err
	}

	cfg := &Config{
		Server: ServerConfig{
			Addr:                    getEnv("SERVER_ADDR", ":8080"),
			GracefulShutdownTimeout: getDurationEnv("GRACEFUL_SHUTDOWN_TIMEOUT", 10*time.Second),
		},
		DB: DBConfig{
			URL: getEnv("AI_DB_URL", "postgres://postgres:postgres@localhost:5435/ai?sslmode=disable"),
		},
		LLM: LLMConfig{
			BaseURL:     strings.TrimRight(getEnv("LLM_BASE_URL", "https://openrouter.ai/api/v1"), "/"),
			APIKey:      getEnv("LLM_API_KEY", ""),
			Model:       getEnv("LLM_MODEL", "openrouter/free"),
			Timeout:     getDurationEnv("LLM_TIMEOUT", 30*time.Second),
			MaxTokens:   getIntEnv("LLM_MAX_TOKENS", 1500),
			Temperature: getFloatEnv("LLM_TEMPERATURE", 0.3),
		},
		MiniappURL: strings.TrimRight(getEnv("MINIAPP_SERVICE_URL", "http://localhost:8082"), "/"),
	}

	if _, err := url.ParseRequestURI(cfg.LLM.BaseURL); err != nil {
		return nil, fmt.Errorf("invalid LLM_BASE_URL: %w", err)
	}
	if cfg.LLM.APIKey == "" {
		return nil, errors.New("LLM_API_KEY is required")
	}
	if _, err := url.ParseRequestURI(cfg.MiniappURL); err != nil {
		return nil, fmt.Errorf("invalid MINIAPP_SERVICE_URL: %w", err)
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

func getFloatEnv(key string, fallback float64) float64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(value, 64)
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
