-- دمج حالة «وصل» ضمن «في الانتظار»
UPDATE appointments
SET visit_status = 'waiting'
WHERE visit_status = 'arrived';
