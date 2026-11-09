/** Retain the offline creation instant rather than the later synchronization time. */
export function patientRegistrationTime(queuedAt?: string, receivedAt = new Date()): Date {
  const candidate = queuedAt ? new Date(queuedAt) : receivedAt;
  return Number.isFinite(candidate.getTime()) && candidate <= receivedAt ? candidate : receivedAt;
}
