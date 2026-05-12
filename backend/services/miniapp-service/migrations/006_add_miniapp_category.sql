ALTER TABLE miniapps
    ADD COLUMN IF NOT EXISTS category VARCHAR(80) NOT NULL DEFAULT 'Utilities & Lifestyle';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_miniapps_category'
    ) THEN
        ALTER TABLE miniapps
            ADD CONSTRAINT chk_miniapps_category
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
            ));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_miniapps_category ON miniapps(category);
