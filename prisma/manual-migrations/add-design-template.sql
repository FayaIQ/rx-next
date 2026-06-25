ALTER TABLE recipe_settings
ADD COLUMN IF NOT EXISTS design_template VARCHAR(255) NOT NULL DEFAULT 'classic';
