-- Session clock times are stored independently of their calendar date.
ALTER TABLE treatment_sessions
  ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(5) NULL;

-- Keep already-booked appointment times intact (appointment timestamps are UTC).
UPDATE treatment_sessions AS session
SET scheduled_time = to_char(appointment.appointment_datetime + INTERVAL '3 hours', 'HH24:MI')
FROM appointments AS appointment
WHERE session.appointment_id = appointment.id
  AND session.scheduled_time IS NULL;
