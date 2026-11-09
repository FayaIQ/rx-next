// swift-tools-version: 5.9
import PackageDescription

// Offline macOS utility for decoding preserved rich-text medical notes.
let package = Package(
    name: "ClinicalNoteTools",
    platforms: [.macOS(.v12)],
    products: [.executable(name: "decode-rich-notes", targets: ["DecodeRichNotes"])],
    targets: [.executableTarget(name: "DecodeRichNotes", path: "scripts/curex", sources: ["decode-rich-notes.swift"])]
)
