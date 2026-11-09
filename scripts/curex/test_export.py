import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
import sys
import subprocess

spec = importlib.util.spec_from_file_location("curex_export", Path(__file__).with_name("export.py"))
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


class SourcePreservation(unittest.TestCase):
    def record(self, entity, value, patients=None, visits=None):
        raw = json.dumps(value, ensure_ascii=False)
        digest = hashlib.sha256(raw.encode("utf-16le")).hexdigest()
        return export.record_from_source(entity, str(value["Id"]), raw, digest, patients or {}, visits or {}, {"Sex": {"1": "Male", "2": "Female"}, "DurationUnit": {"1": "Day"}, "RelationToMeal": {"1": "AfterMeal"}}, "2026-11-05T20:00:10")

    def test_xaml_attribute_text_and_paragraphs_are_retained(self):
        text = '<FlowDocument xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"><Paragraph><Run Text="سطر محفوظ  "/><Run>tail</Run><LineBreak/><Run>سطر ثان</Run></Paragraph><Paragraph>فقرة أخرى</Paragraph></FlowDocument>'
        self.assertEqual(export.xml_text(text), "سطر محفوظ  tail\nسطر ثان\nفقرة أخرى")
        with self.assertRaises(ValueError):
            export.xml_text('<!DOCTYPE a [<!ENTITY e "unsafe">]><a>&e;</a>')

    @unittest.skipUnless(sys.platform == "darwin", "Platform RTF reader runs during offline macOS preparation")
    def test_rtf_note_decoding_preserves_medical_text_and_original_bytes(self):
        note = r"{\urtf1\ansi\ansicpg65001{\fonttbl{\f0 Times New Roman;}}\uc1\pard\f0 fever\par 110/80\par \u1587?\u1604?\u1575?\u1605?\par}"
        raw = json.dumps({"Original": note}, ensure_ascii=False)
        row = {"sourceId": "1", "entity": "Visits", "rawJson": raw, "rawSha256": hashlib.sha256(raw.encode()).hexdigest(), "presentation": {"noteText": note}}
        result = subprocess.run(["swift", str(Path(__file__).with_name("decode-rich-notes.swift"))], input=json.dumps(row)+"\n", capture_output=True, text=True, check=True)
        converted = json.loads(result.stdout)
        self.assertEqual(converted["presentation"]["noteText"], "fever\n110/80\nسلام")
        self.assertEqual(converted["rawJson"], raw)
        self.assertEqual(converted["rawSha256"], row["rawSha256"])

    def test_invalid_source_values_are_reviewed_without_replacement(self):
        raw = {"Id": 1, "PersonalInformation_FirstName": "  اسم تجريبي  ", "PersonalInformation_Sex": 0,
               "PersonalInformation_Birthdate": "2989-11-23T00:00:00", "PersonalInformation_PhoneNumber": "11111111111",
               "CreateDate": "2020-01-01T00:00:00", "Deleted": False, "Allergies": None}
        row = self.record("Patients", raw)
        self.assertEqual(json.loads(row["rawJson"]), raw)
        self.assertEqual(row["sourceDate"], raw["CreateDate"])
        self.assertEqual(row["state"], "review")
        self.assertEqual(set(row["reviewReasons"]), {"unknown_gender", "birthdate_future", "birthdate_after_registration", "phone_placeholder"})

    def test_drug_chronology_comes_from_parent_visit_not_migration_time(self):
        raw = {"Id": 2, "VisitId": 9, "DrugName": "Fixture medicine", "CreateDate": "2026-09-08T22:00:00", "DurationUnit": 3, "Deleted": False}
        row = self.record("PrescribedDrugs", raw, {"7": {"name": "Fixture", "date": "2019-01-01", "deleted": False}}, {"9": {"patient": "7", "date": "2019-05-01T00:00:00", "deleted": False}})
        self.assertEqual(row["sourceDate"], "2019-05-01T00:00:00")
        self.assertEqual(row["sourcePatientId"], "7")
        self.assertIn("medication_code", row["reviewReasons"])
        self.assertEqual(json.loads(row["rawJson"])["CreateDate"], raw["CreateDate"])

    def test_future_lab_date_and_deleted_source_are_not_reactivated(self):
        value = {"Id": 3, "WorkupDate": "4111-08-19T00:00:00", "Result": "original", "Deleted": True}
        row = self.record("LabWorkups", value)
        self.assertEqual(row["state"], "excluded")
        self.assertIsNone(row["eventDay"])
        self.assertEqual(json.loads(row["rawJson"]), value)


if __name__ == "__main__":
    unittest.main()
