-- One saved manual visit per request, including concurrent retries.
-- NULL allows older clients and automatically recorded visits to keep working.
ALTER TABLE patient_visits
  ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS patient_visits_doctor_patient_request_unique
  ON patient_visits (doctor_id, patient_id, client_request_id);
