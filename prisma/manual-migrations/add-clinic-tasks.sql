-- Internal clinic task board: assignments, patient links, comments, and audit trail.
-- Safe to run once on an existing PostgreSQL database.

BEGIN;

CREATE TABLE IF NOT EXISTS clinic_tasks (
  id BIGSERIAL PRIMARY KEY,
  doctor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id BIGINT NULL REFERENCES patients(id) ON DELETE SET NULL,
  assigned_to_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_by_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'todo',
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  due_at TIMESTAMP(0) NULL,
  completed_at TIMESTAMP(0) NULL,
  archived_at TIMESTAMP(0) NULL,
  created_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT clinic_tasks_status_check
    CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  CONSTRAINT clinic_tasks_priority_check
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS clinic_tasks_doctor_status_archived_index
  ON clinic_tasks (doctor_id, status, archived_at);
CREATE INDEX IF NOT EXISTS clinic_tasks_assignee_status_due_index
  ON clinic_tasks (assigned_to_id, status, due_at);
CREATE INDEX IF NOT EXISTS clinic_tasks_patient_id_index
  ON clinic_tasks (patient_id);

CREATE TABLE IF NOT EXISTS clinic_task_comments (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES clinic_tasks(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS clinic_task_comments_task_created_index
  ON clinic_task_comments (task_id, created_at);

CREATE TABLE IF NOT EXISTS clinic_task_activities (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES clinic_tasks(id) ON DELETE CASCADE,
  actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(32) NOT NULL,
  from_value VARCHAR(255) NULL,
  to_value VARCHAR(255) NULL,
  created_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS clinic_task_activities_task_created_index
  ON clinic_task_activities (task_id, created_at);

COMMIT;
