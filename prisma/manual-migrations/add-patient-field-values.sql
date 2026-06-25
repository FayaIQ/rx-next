-- Run once on PostgreSQL to store personal patient fields on the patient record.
CREATE TABLE IF NOT EXISTS patient_field_values (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_field_id BIGINT NOT NULL REFERENCES patient_fields(id) ON DELETE CASCADE,
  value VARCHAR(255),
  created_at TIMESTAMP(0),
  updated_at TIMESTAMP(0),
  CONSTRAINT patient_field_values_patient_id_patient_field_id_unique UNIQUE (patient_id, patient_field_id)
);

CREATE INDEX IF NOT EXISTS patient_field_values_patient_id_index ON patient_field_values (patient_id);
