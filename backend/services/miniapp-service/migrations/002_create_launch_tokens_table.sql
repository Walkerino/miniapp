CREATE TABLE IF NOT EXISTS miniapp_launch_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    miniapp_id UUID NOT NULL REFERENCES miniapps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    user_role VARCHAR(20) NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_miniapp_launch_tokens_miniapp_id ON miniapp_launch_tokens(miniapp_id);
CREATE INDEX IF NOT EXISTS idx_miniapp_launch_tokens_user_id ON miniapp_launch_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_miniapp_launch_tokens_expires_at ON miniapp_launch_tokens(expires_at);
