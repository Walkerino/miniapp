CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    miniapp_id UUID NOT NULL,
    miniapp_name VARCHAR(255) NOT NULL,
    category VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_miniapp_id ON audit_logs(miniapp_id);
