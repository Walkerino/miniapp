CREATE TABLE IF NOT EXISTS user_favorites (
    user_id UUID NOT NULL,
    miniapp_id UUID NOT NULL REFERENCES miniapps(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, miniapp_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_miniapp_id ON user_favorites(miniapp_id);
