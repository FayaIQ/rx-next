// Offline preparation only: use the platform RTF reader, never execute document content.
import Foundation
import AppKit

while let line = readLine() {
    do {
        guard var row = try JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any],
              var presentation = row["presentation"] as? [String: Any],
              let note = presentation["noteText"] as? String else {
            print(line)
            continue
        }
        let trimmed = note.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasPrefix("{\\rtf") || trimmed.hasPrefix("{\\urtf") {
            let decoded = try NSAttributedString(data: Data(trimmed.utf8), options: [.documentType: NSAttributedString.DocumentType.rtf], documentAttributes: nil).string.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !decoded.contains("\\fonttbl"), !decoded.contains("\\urtf1"), !decoded.contains("\\rtf1") else {
                throw NSError(domain: "MedicalNoteConversion", code: 1)
            }
            presentation["noteText"] = decoded
            presentation["noteFormat"] = "plain-text-v2"
            row["presentation"] = presentation
            row["searchText"] = [row["displayName"] as? String ?? "", row["sourceId"] as? String ?? "", row["sourcePatientId"] as? String ?? "", decoded].joined(separator: " ")
            let output = try JSONSerialization.data(withJSONObject: row, options: [.sortedKeys, .withoutEscapingSlashes])
            print(String(decoding: output, as: UTF8.self))
        } else {
            print(line)
        }
    } catch {
        FileHandle.standardError.write(Data("Rich-note conversion failed; no source data changed.\n".utf8))
        exit(1)
    }
}
