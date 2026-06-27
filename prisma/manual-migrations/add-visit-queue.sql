-- Waiting room queue: visit status per appointment
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS visit_status VARCHAR(20) NOT NULL DEFAULT 'scheduled';

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP(0) NULL;

CREATE INDEX IF NOT EXISTS appointments_doctor_booking_visit_idx
  ON appointments (doctor_id, booking_date, visit_status);
