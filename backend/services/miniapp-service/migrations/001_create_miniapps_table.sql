CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS miniapps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'Utilities & Lifestyle'
        CHECK (category IN (
            'Finance',
            'E-commerce',
            'Food & Delivery',
            'Transport & Travel',
            'Government & Public Services',
            'Education',
            'Healthcare',
            'Entertainment & Media',
            'Business & Productivity',
            'Utilities & Lifestyle'
        )),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_miniapps_status ON miniapps(status);
CREATE INDEX IF NOT EXISTS idx_miniapps_created_by ON miniapps(created_by);
