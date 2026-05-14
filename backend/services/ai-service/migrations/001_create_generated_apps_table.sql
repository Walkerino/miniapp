CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS generated_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    prompt TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    miniapp_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_apps_user_id ON generated_apps(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_apps_miniapp_id ON generated_apps(miniapp_id);
