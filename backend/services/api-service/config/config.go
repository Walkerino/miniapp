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
	Server  ServerConfig
	Proxy   ProxyConfig
	CORS    CORSConfig
	Request RequestConfig
}

type ServerConfig struct {
	Addr                    string
	GracefulShutdownTimeout time.Duration
}

type ProxyConfig struct {
	AuthServiceURL    string
	MiniappServiceURL string
}

type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposeHeaders    []string
	AllowCredentials bool
	MaxAge           int
}

type RequestConfig struct {
	Timeout time.Duration
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
		Proxy: ProxyConfig{
			AuthServiceURL:    strings.TrimRight(getEnv("AUTH_SERVICE_URL", "http://localhost:8081"), "/"),
			MiniappServiceURL: strings.TrimRight(getEnv("MINIAPP_SERVICE_URL", "http://localhost:8082"), "/"),
		},
		CORS: CORSConfig{
			AllowedOrigins:   splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "*")),
			AllowedMethods:   splitCSV(getEnv("CORS_ALLOWED_METHODS", "GET,POST,PATCH,DELETE,OPTIONS")),
			AllowedHeaders:   splitCSV(getEnv("CORS_ALLOWED_HEADERS", "Authorization,Content-Type,X-Requested-With")),
			ExposeHeaders:    splitCSV(getEnv("CORS_EXPOSE_HEADERS", "")),
			AllowCredentials: getBoolEnv("CORS_ALLOW_CREDENTIALS", true),
			MaxAge:           getIntEnv("CORS_MAX_AGE", 600),
		},
		Request: RequestConfig{
			Timeout: getDurationEnv("REQUEST_TIMEOUT", 30*time.Second),
		},
	}

	if _, err := url.ParseRequestURI(cfg.Proxy.AuthServiceURL); err != nil {
		return nil, fmt.Errorf("invalid AUTH_SERVICE_URL: %w", err)
	}
	if _, err := url.ParseRequestURI(cfg.Proxy.MiniappServiceURL); err != nil {
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

func getBoolEnv(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
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

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}
