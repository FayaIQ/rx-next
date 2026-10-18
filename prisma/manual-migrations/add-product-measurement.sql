-- Additive migration. No historical clinic activity or payment is inferred.
CREATE TABLE IF NOT EXISTS clinic_acquisitions (
  doctor_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  practice_type VARCHAR(16) NOT NULL,
  account_mode VARCHAR(16) NOT NULL DEFAULT 'real',
  source VARCHAR(32) NOT NULL DEFAULT 'direct',
  medium VARCHAR(32) NOT NULL DEFAULT 'direct',
  campaign VARCHAR(80),
  registered_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_signin_at TIMESTAMPTZ(3), onboarding_at TIMESTAMPTZ(3),
  first_value_at TIMESTAMPTZ(3), first_value_reported_at TIMESTAMPTZ(3)
);
CREATE INDEX IF NOT EXISTS clinic_acquisition_mode_registered_index ON clinic_acquisitions(account_mode, registered_at);
CREATE INDEX IF NOT EXISTS clinic_acquisition_campaign_index ON clinic_acquisitions(source, campaign, registered_at);
CREATE TABLE IF NOT EXISTS clinic_activities (
  id BIGSERIAL PRIMARY KEY, doctor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_key VARCHAR(100) NOT NULL, kind VARCHAR(32) NOT NULL,
  occurred_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT clinic_activity_action_unique UNIQUE(doctor_id, action_key)
);
CREATE INDEX IF NOT EXISTS clinic_activity_doctor_time_index ON clinic_activities(doctor_id, occurred_at);
CREATE TABLE IF NOT EXISTS product_measurements (
  id VARCHAR(100) PRIMARY KEY, route VARCHAR(100) NOT NULL, metric VARCHAR(32) NOT NULL,
  value DOUBLE PRECISION NOT NULL, device VARCHAR(16) NOT NULL, browser VARCHAR(24) NOT NULL,
  area VARCHAR(24) NOT NULL, account_mode VARCHAR(16) NOT NULL, error_code VARCHAR(32),
  release VARCHAR(48) NOT NULL, created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS product_measurements_route_time_index ON product_measurements(created_at, route, device, metric);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ(3);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paid_currency VARCHAR(8);
CREATE INDEX IF NOT EXISTS patients_doctor_created_index ON patients(doctor_id, created_at);
CREATE INDEX IF NOT EXISTS prescriptions_doctor_date_index ON prescriptions(doctor_id, prescription_date);
CREATE INDEX IF NOT EXISTS prescriptions_doctor_number_index ON prescriptions(doctor_id, prescription_number);
CREATE INDEX IF NOT EXISTS appointments_doctor_booking_index ON appointments(doctor_id, booking_date);
CREATE INDEX IF NOT EXISTS appointments_doctor_datetime_index ON appointments(doctor_id, appointment_datetime);
CREATE INDEX IF NOT EXISTS treatment_plans_doctor_created_index ON treatment_plans(doctor_id, created_at);
CREATE INDEX IF NOT EXISTS finance_transactions_doctor_currency_date_index ON finance_transactions(doctor_id, currency, transaction_date);
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS treatment_plans_client_request_id_key ON treatment_plans(client_request_id);

CREATE TABLE IF NOT EXISTS acquisition_spend (
  id BIGSERIAL PRIMARY KEY, source VARCHAR(32) NOT NULL, campaign VARCHAR(80) NOT NULL DEFAULT '',
  from_date DATE NOT NULL, to_date DATE NOT NULL, amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL, created_by BIGINT NOT NULL, updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT acquisition_spend_period_unique UNIQUE(source, campaign, from_date, to_date, currency)
);

ALTER TABLE clinic_acquisitions ADD COLUMN IF NOT EXISTS visit_key VARCHAR(36);
ALTER TABLE product_measurements ADD COLUMN IF NOT EXISTS visit_key VARCHAR(36);
ALTER TABLE product_measurements ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'direct';
ALTER TABLE product_measurements ADD COLUMN IF NOT EXISTS campaign VARCHAR(80);
ALTER TABLE product_measurements ADD COLUMN IF NOT EXISTS user_role VARCHAR(16) NOT NULL DEFAULT 'visitor';
ALTER TABLE product_measurements ADD COLUMN IF NOT EXISTS practice_type VARCHAR(16);
ALTER TABLE product_measurements ADD COLUMN IF NOT EXISTS environment VARCHAR(16) NOT NULL DEFAULT 'production';
CREATE INDEX IF NOT EXISTS product_measurements_visit_time_index ON product_measurements(visit_key, created_at);
