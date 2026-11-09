-- Future registrations get a timestamp. Historical NULL dates remain unknown.
ALTER TABLE patients ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
