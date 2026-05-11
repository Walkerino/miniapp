CREATE TABLE IF NOT EXISTS miniapp_launches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    miniapp_id UUID NOT NULL REFERENCES miniapps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(100),
    launched_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_miniapp_launches_miniapp_id ON miniapp_launches(miniapp_id);
CREATE INDEX IF NOT EXISTS idx_miniapp_launches_user_id ON miniapp_launches(user_id);
