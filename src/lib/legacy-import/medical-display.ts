import type { ArchiveRecord } from "./types";

export type MedicalField = { label: string; value: string };
const text = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const translated = (ar: boolean, arabic: string, english: string) => ar ? arabic : english;

/** Format source calendar components directly. Never round, shift timezone, or invent a time. */
export function medicalDate(value: unknown, locale = "ar", time = false) {
  const s = text(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (!match) return "";
  const [, year, month, day, hour, minute] = match;
  const date = `${day}/${month}/${year}`;
  if (!time || !hour || (hour === "00" && minute === "00")) return date;
  if (locale !== "ar") return `${date} · ${hour}:${minute}`;
  return `${date} · ${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? "مساءً" : "صباحاً"}`;
}

export function patientGender(row: ArchiveRecord, locale = "ar") {
  const label = (row.presentation.enumLabels as Record<string, string> | undefined)?.PersonalInformation_Sex;
  if (label === "Male") return locale === "ar" ? "ذكر" : "Male";
  if (label === "Female") return locale === "ar" ? "أنثى" : "Female";
  return locale === "ar" ? "غير محدد" : "Unspecified";
}

export function patientPhone(row: ArchiveRecord) {
  if (row.reviewReasons.some((r) => r === "phone_placeholder" || r === "phone_format")) return "";
  return text(row.presentation.fields.PersonalInformation_PhoneNumber);
}

export function patientBirthdate(row: ArchiveRecord, locale = "ar") {
  if (row.reviewReasons.some((r) => ["birthdate_future", "birthdate_after_registration", "invalid_date"].includes(r))) return "";
  return medicalDate(row.presentation.fields.PersonalInformation_Birthdate, locale);
}

export function recordDate(row: ArchiveRecord, locale = "ar", includeTime = false) {
  if (row.reviewReasons.includes("future_date") || row.reviewReasons.includes("invalid_date")) return "";
  return medicalDate(row.sourceDate, locale, includeTime);
}

export function patientFields(row: ArchiveRecord, locale = "ar"): MedicalField[] {
  const ar = locale === "ar", f = row.presentation.fields;
  const result: MedicalField[] = [{ label: translated(ar, "الجنس", "Sex"), value: patientGender(row, locale) }];
  const add = (label: string, value: unknown) => { const v = text(value); if (v) result.push({ label, value: v }); };
  add(translated(ar, "تاريخ الميلاد", "Birth date"), patientBirthdate(row, locale));
  add(translated(ar, "رقم الهاتف", "Phone"), patientPhone(row));
  add(translated(ar, "رقم الملف", "File number"), f.Mrn || f.PersonalInformation_LegacyId);
  add(translated(ar, "العنوان", "Address"), f.PersonalInformation_Address);
  add(translated(ar, "المهنة", "Occupation"), f.PersonalInformation_Occupation);
  add(translated(ar, "رقم الهوية", "Identity number"), f.PersonalInformation_NationalId);
  add(translated(ar, "اسم الأم", "Mother's name"), f.PersonalInformation_MotherFullName);
  add(translated(ar, "البريد الإلكتروني", "Email"), f.PersonalInformation_Email);
  add(translated(ar, "تاريخ التسجيل", "Registered"), medicalDate(row.sourceDate, locale));
  return result;
}

export function patientHistoryFields(row: ArchiveRecord, locale = "ar"): MedicalField[] {
  const f = row.presentation.fields, ar = locale === "ar";
  return ([
    ["Allergies", "الحساسيات", "Allergies"], ["ChronicDrugs", "الأدوية المستمرة", "Long-term medicines"],
    ["PastMedicalHistory", "التاريخ الطبي", "Medical history"], ["PastSurgicalHistory", "التاريخ الجراحي", "Surgical history"],
    ["PastOcularHistory", "التاريخ العيني", "Eye history"],
  ] as const).flatMap(([key, arabic, english]) => text(f[key]) ? [{ label: translated(ar, arabic, english), value: text(f[key]) }] : []);
}

export function medicineFields(row: ArchiveRecord, locale = "ar"): MedicalField[] {
  const ar = locale === "ar", f = row.presentation.fields;
  const labels = row.presentation.enumLabels as Record<string, string> | undefined;
  const result: MedicalField[] = [];
  const add = (label: string, value: unknown) => { const v = text(value); if (v) result.push({ label, value: v }); };
  add(translated(ar, "الشكل", "Form"), f.DosageForm);
  add(translated(ar, "الجرعة", "Dose"), [f.Dose, f.DoseUnit].map(text).filter(Boolean).join(" "));
  // Retain entered notation without inventing a daily interval or interpreting an unset zero.
  const start = text(f.FrequencyStart), end = text(f.FrequencyEnd);
  if (Number(start) > 0 && Number(end) > 0) add(translated(ar, "الجدول المدوّن", "Recorded schedule"), `${start} × ${end}`);
  const duration = text(f.Duration);
  const units: Record<string, [string, string]> = { Day: ["يوم", "day"], Week: ["أسبوع", "week"], Month: ["شهر", "month"] };
  if (duration && labels?.DurationUnit && units[labels.DurationUnit]) add(translated(ar, "المدة", "Duration"), `${duration} ${units[labels.DurationUnit][ar ? 0 : 1]}`);
  else if (duration && (f.DurationUnit === null || f.DurationUnit === undefined)) add(translated(ar, "المدة", "Duration"), duration);
  if (labels?.RelationToMeal === "AfterMeal") add(translated(ar, "وقت الاستخدام", "When to take"), translated(ar, "بعد الطعام", "After meals"));
  if (labels?.RelationToMeal === "BeforeMeal") add(translated(ar, "وقت الاستخدام", "When to take"), translated(ar, "قبل الطعام", "Before meals"));
  if (f.IsContinuous === true) add(translated(ar, "الاستمرار", "Course"), translated(ar, "علاج مستمر", "Continuous treatment"));
  return result;
}

export function observationFields(row: ArchiveRecord, locale = "ar"): MedicalField[] {
  const ar = locale === "ar", f = row.presentation.fields;
  const fields: MedicalField[] = [];
  const add = (key: string, arabic: string, english: string, unit = "", max = Infinity) => {
    const value = f[key];
    if (value !== null && value !== undefined && text(value) && Number(value) >= 0 && Number(value) <= max) fields.push({ label: translated(ar, arabic, english), value: `${text(value)}${unit ? ` ${unit}` : ""}` });
  };
  if (Number(f.BloodPressureSystolic) > 0 && Number(f.BloodPressureDiastolic) > 0) fields.push({ label: translated(ar, "ضغط الدم", "Blood pressure"), value: `${text(f.BloodPressureSystolic)} / ${text(f.BloodPressureDiastolic)}` });
  add("PulseRate", "النبض", "Pulse", translated(ar, "نبضة/دقيقة", "bpm"));
  add("Spo2", "تشبع الأوكسجين", "Oxygen saturation", "%", 100);
  add("TemperatureCelsius", "الحرارة", "Temperature", "°C");
  add("WeightKg", "الوزن", "Weight", "kg"); add("HeightCm", "الطول", "Height", "cm");
  add("SerumCreatinineMgDl", "كرياتينين الدم", "Creatinine", "mg/dL"); add("BloodGlucoseMgDl", "سكر الدم", "Blood glucose", "mg/dL");
  add("RespiratoryRate", "معدل التنفس", "Respiratory rate"); add("PainScore", "درجة الألم", "Pain score");
  if (f.OnSupplementalOxygen === true) fields.push({ label: translated(ar, "الأوكسجين", "Oxygen"), value: translated(ar, "أوكسجين إضافي", "Supplemental oxygen") });
  return fields;
}

/** Clinically useful, explicitly named fields only; never dump database columns or numeric enums. */
export function medicalFields(row: ArchiveRecord, locale = "ar", references?: Record<string, string>): MedicalField[] {
  const ar = locale === "ar", f = row.presentation.fields;
  if (row.entity === "Patients") return patientFields(row, locale);
  if (["PrescribedDrugs", "DrugTemplates", "PrescriptionListTemplateItems", "VisitTemplateItems"].includes(row.entity)) return medicineFields(row, locale);
  if (row.entity === "VitalSigns") return observationFields(row, locale);
  const result: MedicalField[] = [];
  const add = (arabic: string, english: string, value: unknown) => { const v = text(value); if (v && !/^\s*<\??(?:FlowDocument|Section|Paragraph|xml)/i.test(v)) result.push({ label: translated(ar, arabic, english), value: v }); };
  if (row.entity === "Visits") {
    add("التشخيص", "Diagnosis", f.DiagnosisHandwrittenText || references?.[`Icd10Diagnoses:${f.DiagnosisIcd10Id}`]);
    add("ملاحظات إضافية", "Additional notes", f.PrintableNotes);
  } else if (row.entity === "Appointments") {
    if (f.TimeFrom) add("وقت الموعد", "Appointment time", text(f.TimeFrom).slice(0, 5));
    if (f.TimeTo) add("نهاية الموعد", "End time", text(f.TimeTo).slice(0, 5));
    add("الطبيب المحيل", "Referring doctor", references?.[`ReferringDoctors:${f.ReferringDoctorId}`]);
  } else if (row.entity === "LabWorkups") {
    add("النتيجة", "Result", [f.Result, f.Unit].map(text).filter(Boolean).join(" "));
  } else if (row.entity === "Histories") {
    add("الشكوى الرئيسية", "Chief complaint", f.ChiefComplaint);
    add("تاريخ الحالة الحالية", "History of present illness", f.HistoryOfPresentIllness);
    add("ملاحظات المريض", "Patient concerns", f.IdeasConcernsExpectations);
  } else if (row.entity === "PatientDiagnoses") {
    add("التشخيص", "Diagnosis", f.HandwrittenText || references?.[`Icd10Diagnoses:${f.Icd10DiagnosisId}`]);
  } else if (row.entity === "ReferringDoctors") {
    add("الاسم", "Name", f.FullName); add("رقم الهاتف", "Phone", f.PhoneNumber);
  } else if (row.entity === "TextTemplates") add("النص", "Text", f.ContentPlainText);
  return result;
}

export function recordNotes(row: ArchiveRecord) {
  const f = row.presentation.fields;
  const value = row.presentation.noteText || (row.entity === "VitalSigns" ? f.Note : f.Notes);
  const note = text(value);
  return /^\s*\{\\u?rtf/i.test(note) ? "" : /^\s*<\??(?:FlowDocument|Section|Paragraph|xml)/i.test(note) ? "" : note;
}
