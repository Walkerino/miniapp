# Miniapp Platform

Платформа для создания, публикации и запуска мини-приложений. Проект собран как монорепозиторий: React-фронтенд, несколько Go-сервисов, PostgreSQL-базы для отдельных доменов и общий API Gateway.

## Что внутри

- `frontend/` - клиентское приложение на React и Vite.
- `backend/services/auth-service/` - регистрация, авторизация, JWT и профиль пользователя.
- `backend/services/miniapp-service/` - каталог мини-приложений, запуск, избранное и аудит.
- `backend/services/ai-service/` - генерация мини-приложений через LLM-провайдера.
- `backend/services/api-service/` - единая точка входа для фронтенда и проксирование запросов в сервисы.
- `backend/deploy/` - Docker Compose, Makefile и пример переменных окружения.

## Быстрый запуск локально

```bash
cd backend/deploy
cp .env.example .env
docker compose up --build -d
```

Если Docker запускается через `sudo`, можно использовать Makefile:

```bash
cd backend/deploy
make up
```

После запуска будут доступны:

- фронтенд: http://localhost:8080
- API Gateway: http://localhost:8086
- Swagger UI: http://localhost:8085
- auth-service: http://localhost:8081
- miniapp-service: http://localhost:8082
- ai-service: http://localhost:8083

Остановить окружение:

```bash
cd backend/deploy
docker compose down
```

## API ключ для генерации

Чтобы пользоваться генерацией мини-приложений локально, добавьте свой API ключ LLM-провайдера (OpenRouter).

В `backend/deploy/docker-compose.yml` переменная уже проброшена в `ai-service`:

```yaml
LLM_API_KEY: ${LLM_API_KEY:-}
```

Сам ключ укажите в `backend/deploy/.env`:

```env
LLM_API_KEY=your_api_key_here
```

По умолчанию сервис настроен на OpenRouter:

```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=openrouter/free
```

Без `LLM_API_KEY` проект соберется, но `ai-service` не сможет выполнять генерацию.

## Переменные окружения

Основные переменные лежат в `backend/deploy/.env.example`. Перед запуском скопируйте файл в `.env` и при необходимости измените значения:

```bash
cd backend/deploy
cp .env.example .env
```

Минимально полезные переменные:

- `AUTH_DB_PASSWORD` - пароль базы auth-service.
- `MINIAPP_DB_PASSWORD` - пароль базы miniapp-service.
- `AI_DB_PASSWORD` - пароль базы ai-service.
- `JWT_SECRET` - секрет для подписи JWT.
- `LLM_API_KEY` - API ключ LLM-провайдера для генерации приложений.

## Локальная разработка фронтенда

```bash
cd frontend
npm install
npm run dev
```

Для сборки:

```bash
cd frontend
npm run build
```

## Локальная разработка backend-сервисов

Каждый backend-сервис является отдельным Go-модулем. Например:

```bash
cd backend/services/auth-service
go mod download
go run ./cmd
```

Аналогично можно запускать `api-service`, `miniapp-service` и `ai-service` из их директорий.

## Документация API

OpenAPI-спецификации лежат в директориях сервисов:

- `backend/services/api-service/docs/openapi.yaml`

При запуске через Docker Compose Swagger UI доступен по адресу http://localhost:8085.
