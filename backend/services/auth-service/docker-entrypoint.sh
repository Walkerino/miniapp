#!/bin/sh
set -eu

if [ -f /app/.env ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            ""|\#*) continue ;;
            export\ *) line="${line#export }" ;;
        esac

        key="${line%%=*}"
        value="${line#*=}"
        if [ "$key" = "$line" ]; then
            continue
        fi
        case "$key" in
            ""|[0-9]*|*[!A-Za-z0-9_]*) continue ;;
        esac

        eval "is_set=\${$key+x}"
        if [ -n "$is_set" ]; then
            continue
        fi

        export "$key=$value"
    done < /app/.env
fi

db_url="${MIGRATIONS_DB_URL:-${USER_DB_URL:-postgres://postgres:postgres@localhost:5432/auth?sslmode=disable}}"
retries="${DB_WAIT_RETRIES:-30}"
delay="${DB_WAIT_DELAY_SECONDS:-2}"

echo "Waiting for database..."
i=1
while ! pg_isready -d "$db_url" >/dev/null 2>&1; do
    if [ "$i" -ge "$retries" ]; then
        echo "Database is not ready after $retries attempts"
        exit 1
    fi

    i=$((i + 1))
    sleep "$delay"
done

echo "Running migrations..."
for migration in /app/migrations/*.sql; do
    [ -e "$migration" ] || continue

    filename="$(basename "$migration")"
    echo "Applying $filename"
    psql "$db_url" -v ON_ERROR_STOP=1 -f "$migration"
done

echo "Starting auth-service..."
exec "$@"
