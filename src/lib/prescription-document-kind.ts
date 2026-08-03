export type PrescriptionDocumentKind = "prescription" | "message";

export type PrescriptionDocumentMeta = {
  documentKind: PrescriptionDocumentKind;
  messageText: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readPrescriptionDocumentMeta(
  additionalInfo: unknown
): PrescriptionDocumentMeta {
  const info = asRecord(additionalInfo);
  return {
    documentKind:
      info.documentKind === "message" ? "message" : "prescription",
    messageText:
      typeof info.messageText === "string" ? info.messageText : "",
  };
}

export function buildPrescriptionAdditionalInfo(
  existing: unknown,
  documentKind: PrescriptionDocumentKind,
  messageText: string
): Record<string, unknown> {
  return {
    ...asRecord(existing),
    documentKind,
    messageText: documentKind === "message" ? messageText : "",
  };
}
