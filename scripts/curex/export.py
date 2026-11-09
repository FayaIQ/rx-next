"""Read-only CureX export. Patient data belongs in a private directory outside Git."""
import argparse
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

ENTITIES = ["Patients", "Visits", "PrescribedDrugs", "Appointments", "LabWorkups", "VitalSigns", "Histories",
            "PatientChronicConditions", "PatientDiagnoses", "PatientFamilyHistories", "Attachments", "SavedFiles",
            "DrugTemplates", "PrescriptionListTemplates", "PrescriptionListTemplateItems", "TextTemplates",
            "VisitTemplates", "VisitTemplateItems", "ReferringDoctors", "HandwrittenDiagnosisCatalog", "Icd10Diagnoses"]
TECHNICAL = {"PublicId", "SyncInclusion", "SyncRevision", "TenantId", "Version", "PersonalInformation_PatientPicture", "Data"}
VITALS = ["BloodPressureSystolic", "BloodPressureDiastolic", "PulseRate", "Spo2", "TemperatureCelsius", "WeightKg", "HeightCm", "SerumCreatinineMgDl", "BloodGlucoseMgDl", "Consciousness", "PainScore", "RespiratoryRate"]


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def private_write(path, value):
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w", encoding="utf-8") as f:
        f.write(json.dumps(value, ensure_ascii=False, indent=2))
        f.flush()
        os.fsync(f.fileno())


def xml_text(text):
    if not text:
        return ""
    if "<!DOCTYPE" in text.upper() or "<!ENTITY" in text.upper():
        raise ValueError("XML declarations are not supported")
    root = ET.fromstring(text)

    def walk(node):
        tag = node.tag.split("}")[-1]
        if tag == "LineBreak":
            return "\n"
        result = (node.text or "") + (node.get("Text") or "")
        for child in node:
            result += walk(child) + (child.tail or "")
        if tag in {"Paragraph", "ListItem", "TableRow"}:
            result += "\n"
        return result
    return walk(root).strip()


def source_day(value):
    if not isinstance(value, str):
        return None
    try:
        date = dt.date.fromisoformat(value[:10])
        return date.isoformat() if date.year >= 1900 else None
    except ValueError:
        return None


def record_from_source(entity, source_id, raw_json, sql_hash, patients, visits, enum_maps, backup_local):
    # The server-side hash proves that CLI line wrapping/encoding has not changed ANY source text.
    assert hashlib.sha256(raw_json.encode("utf-16le")).hexdigest().lower() == sql_hash.lower(), "SQL source round-trip mismatch"
    raw = json.loads(raw_json, parse_float=str)
    reasons = []
    patient_id = str(raw["PatientId"]) if raw.get("PatientId") is not None else None
    visit_id = str(raw["VisitId"]) if raw.get("VisitId") is not None else None
    source_date = raw.get("CreateDate")
    name = ""
    fields = {k: v for k, v in raw.items() if k not in TECHNICAL}
    presentation = {"fields": fields}
    if entity == "Patients":
        patient_id = source_id
        name = " ".join(str(raw.get("PersonalInformation_" + k) or "").strip() for k in ["FirstName", "FatherName", "GrandFatherName", "GreatGrandFatherName", "LastName"])
        name = re.sub(r"\s+", " ", name).strip()
        sex = str(raw.get("PersonalInformation_Sex"))
        if sex not in enum_maps["Sex"]:
            reasons.append("unknown_gender")
        else:
            presentation["enumLabels"] = {"PersonalInformation_Sex": enum_maps["Sex"][sex]}
        birth = raw.get("PersonalInformation_Birthdate")
        if not source_day(birth):
            reasons.append("invalid_date")
        elif birth > backup_local:
            reasons.append("birthdate_future")
        if birth and source_date and birth > source_date:
            reasons.append("birthdate_after_registration")
        phone = str(raw.get("PersonalInformation_PhoneNumber") or "").strip()
        digits = "".join(str(int(c)) for c in phone if c.isdigit())
        local = re.sub(r"^00", "", digits)
        local = re.sub(r"^964", "", local).lstrip("0")
        if phone and (len(set(digits)) <= 1 or len(digits) < 7):
            reasons.append("phone_placeholder")
        elif phone and not re.fullmatch(r"7\d{9}", local):
            reasons.append("phone_format")
        patients[source_id] = {"name": name, "date": source_date, "deleted": bool(raw.get("Deleted"))}
    elif entity == "Visits":
        source_date = raw.get("VisitDate")
        visit_id = source_id
        visits[source_id] = {"patient": patient_id, "date": source_date, "deleted": bool(raw.get("Deleted"))}
        if patient_id in patients and source_day(source_date) and source_day(patients[patient_id]["date"]) and source_date[:10] < patients[patient_id]["date"][:10]:
            reasons.append("visit_before_registration")
    elif entity == "PrescribedDrugs":
        parent = visits.get(visit_id)
        if parent:
            patient_id, source_date = parent["patient"], parent["date"]
            presentation["dateOrigin"] = "Visits.VisitDate"
    elif entity == "Appointments":
        source_date = raw.get("AppointmentDate")
        if not raw.get("TimeFrom"):
            reasons.append("appointment_time_unknown")
        # No appointment status is invented or converted to a current RX calendar action.
        reasons.append("appointment_status_code")
    elif entity == "LabWorkups":
        source_date = raw.get("WorkupDate")
        if source_day(source_date) and source_date[:10] < "2019-09-14":
            reasons.append("old_lab_date")
    elif entity == "VitalSigns":
        source_date = raw.get("TakenAt") or raw.get("CreateDate")
        if not any(raw.get(k) is not None for k in VITALS) and not raw.get("Note") and not raw.get("OnSupplementalOxygen"):
            reasons.append("empty_vitals")
        if any(raw.get(k) is not None and float(raw[k]) < 0 for k in VITALS) or (raw.get("Spo2") is not None and float(raw["Spo2"]) > 100):
            reasons.append("invalid_vital")
    if entity in {"PrescribedDrugs", "DrugTemplates", "PrescriptionListTemplateItems", "VisitTemplateItems"}:
        name = raw.get("DrugName") or ""
        labels = {}
        for key in ["DurationUnit", "RelationToMeal"]:
            code = raw.get(key)
            if code is not None:
                label = enum_maps[key].get(str(code))
                if label:
                    labels[key] = label
                else:
                    reasons.append("medication_code")
        if labels:
            presentation["enumLabels"] = labels
    if patient_id and patient_id not in patients:
        reasons.append("missing_patient")
    if patient_id in patients and patients[patient_id]["deleted"] and not raw.get("Deleted"):
        reasons.append("linked_deleted_record")
    if visit_id in visits and visits[visit_id]["deleted"] and not raw.get("Deleted"):
        reasons.append("linked_deleted_record")
    event_day = source_day(source_date)
    if source_date and not event_day:
        reasons.append("invalid_date")
    if event_day and source_date > backup_local:
        reasons.append("future_date")
        event_day = None
    note = raw.get("VisitNotes") if entity == "Visits" else (raw.get("ContentXaml") if entity == "TextTemplates" else None)
    if note:
        try:
            presentation["noteText"] = xml_text(note)
        except (ET.ParseError, ValueError):
            reasons.append("invalid_note")
        fields.pop("VisitNotes", None)
        fields.pop("ContentXaml", None)
    elif entity == "Histories" and raw.get("NotesPlainText"):
        presentation["noteText"] = raw["NotesPlainText"]
    name = str(name or raw.get("TemplateName") or raw.get("TestName") or raw.get("ConditionName") or raw.get("Title") or "")
    if not name and patient_id in patients:
        name = patients[patient_id]["name"]
    if not name:
        name = str(raw.get("ArabicName") or raw.get("EnglishName") or entity)
    reasons = sorted(set(reasons))
    deleted = bool(raw.get("Deleted"))
    state = "excluded" if deleted else ("review" if reasons else "ready")
    search = " ".join([name, source_id, str(patient_id or ""), str(raw.get("Mrn") or ""), str(raw.get("PersonalInformation_LegacyId") or ""), str(raw.get("PersonalInformation_PhoneNumber") or ""), str(presentation.get("noteText") or ""), str(raw.get("Result") or ""), str(raw.get("DrugName") or ""), str(raw.get("Notes") or "")])
    return {"entity": entity, "sourceId": source_id, "sourcePatientId": patient_id, "sourceVisitId": visit_id,
            "sourceDate": source_date, "eventDay": event_day, "displayName": name, "searchText": search,
            "sourceDeleted": deleted, "state": state, "reviewReasons": reasons, "rawJson": raw_json,
            "rawSha256": hashlib.sha256(raw_json.encode()).hexdigest(), "sourceUtf16Sha256": sql_hash.lower(), "presentation": presentation}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--container", required=True)
    parser.add_argument("--database", default="CureXInspect")
    parser.add_argument("--source-file", type=Path, required=True)
    parser.add_argument("--evidence-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    assert re.fullmatch(r"[A-Za-z0-9_-]+", args.database)
    args.output_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(args.output_dir, 0o700)
    assert not (args.output_dir / "manifest.json").exists(), "Use a new private export directory"

    def query(sql):
        command = ["docker", "exec", "-i", args.container, "/bin/bash", "-c", 'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" exec /opt/mssql-tools18/bin/sqlcmd -S 127.0.0.1,1433 -U sa -C -b -r 1 -y 0 -w 65535 -f 65001']
        result = subprocess.run(command, input="SET NOCOUNT ON; SET QUOTED_IDENTIFIER ON; USE [" + args.database + "];\n" + sql, text=True, encoding="utf-8", capture_output=True, timeout=180)
        if result.returncode:
            raise RuntimeError("Source query failed; no records imported")
        # Never strip JSON chunks: spaces at SQLCMD wrapping boundaries may be patient text.
        return json.loads(result.stdout.replace("\r\n", "\n").replace("\n", ""))

    assert query("SELECT is_read_only FROM sys.databases WHERE name=DB_NAME() FOR JSON PATH;")[0]["is_read_only"]
    initial = json.loads((args.evidence_dir / "manifest.json").read_text())
    source_hash = hashlib.file_digest(args.source_file.open("rb"), "sha256").hexdigest()
    verified = json.loads((args.evidence_dir / "source-verification.json").read_text())
    assert source_hash == verified["sourceSha256"], "Source changed since inspection"
    maps = {"Sex": {}, "DurationUnit": {}, "RelationToMeal": {}}
    evidence = json.loads((args.evidence_dir / "sex-enum-evidence.json").read_text())
    for item in evidence:
        if item.get("label") and item.get("code") is not None:
            key = str(item["code"])
            assert key not in maps["Sex"] or maps["Sex"][key] == item["label"]
            maps["Sex"][key] = item["label"]
    medication_evidence = json.loads((args.evidence_dir / "med-enum-evidence.json").read_text())
    for item in medication_evidence:
        if item.get("label") and item.get("code") is not None:
            key = str(item["code"])
            assert key not in maps[item["kind"]] or maps[item["kind"]][key] == item["label"]
            maps[item["kind"]][key] = item["label"]
    headers = json.loads((args.evidence_dir / "backup-header.json").read_text())
    backup_local = headers[0]["BackupFinishDate"].replace(" ", "T")
    patients, visits, files = {}, {}, []
    stats = {"total": 0, "states": {"ready": 0, "review": 0, "excluded": 0}, "entities": {}, "reviewReasons": {}}
    for entity in ENTITIES:
        # Only diagnosis reference rows actually used by this clinic's data are copied.
        where = " WHERE t.Id IN (SELECT DiagnosisIcd10Id FROM dbo.Visits WHERE DiagnosisIcd10Id IS NOT NULL UNION SELECT Icd10DiagnosisId FROM dbo.PatientDiagnoses WHERE Icd10DiagnosisId IS NOT NULL UNION SELECT DiagnosisIcd10Id FROM dbo.VisitTemplates WHERE DiagnosisIcd10Id IS NOT NULL)" if entity == "Icd10Diagnoses" else ""
        expected = query("SELECT COUNT_BIG(*) AS n FROM dbo.[" + entity + "] t" + where + " FOR JSON PATH;")[0]["n"]
        counts = {"total": 0, "ready": 0, "review": 0, "excluded": 0}
        destination = args.output_dir / (entity + ".jsonl")
        digest = hashlib.sha256()
        with os.fdopen(os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "wb") as output:
            for offset in range(0, expected, 400):
                sql = "SELECT CONVERT(varchar(80),t.Id) AS sourceId,j.rawJson,CONVERT(varchar(64),HASHBYTES('SHA2_256',CONVERT(varbinary(max),j.rawJson)),2) AS sourceHash\n"
                sql += "FROM dbo.[" + entity + "] t CROSS APPLY (SELECT (SELECT t.* FOR JSON PATH,INCLUDE_NULL_VALUES,WITHOUT_ARRAY_WRAPPER) AS rawJson) j" + where
                sql += "\nORDER BY t.Id OFFSET " + str(offset) + " ROWS FETCH NEXT 400 ROWS ONLY FOR JSON PATH;"
                for row in query(sql):
                    record = record_from_source(entity, row["sourceId"], row["rawJson"], row["sourceHash"], patients, visits, maps, backup_local)
                    line = (encode(record) + "\n").encode()
                    output.write(line); digest.update(line)
                    counts["total"] += 1; counts[record["state"]] += 1
                    stats["states"][record["state"]] += 1
                    for reason in record["reviewReasons"]:
                        stats["reviewReasons"][reason] = stats["reviewReasons"].get(reason, 0) + 1
            output.flush(); os.fsync(output.fileno())
        assert counts["total"] == expected, "Source count mismatch"
        files.append({"name": destination.name, "sha256": digest.hexdigest(), "records": expected, "bytes": destination.stat().st_size})
        stats["total"] += expected; stats["entities"][entity] = counts
        print(encode({"entity": entity, **counts}), flush=True)
    manifest = {"formatVersion": 1, "sourceName": args.source_file.name, "sourceSha256": source_hash,
                "sourceCreatedAt": initial["metadata"]["createdUtc"], "backupLocalTime": backup_local,
                "metadata": {"sourceSystem": "CureX", "enumMaps": maps, "enumEvidence": {"sex": evidence, "medications": medication_evidence},
                             "preservation": "Every rawJson string verified against SQL Server UTF-16 SHA256; original dates and null fields retained.",
                             "excludedSystemTables": "Authentication, audit, permissions, search indexes and shared software catalogs are not patient records."},
                "stats": stats, "files": files}
    private_write(args.output_dir / "manifest.json", manifest)
    print(encode({"exportComplete": True, "records": stats["total"], "states": stats["states"]}), flush=True)


if __name__ == "__main__":
    main()
