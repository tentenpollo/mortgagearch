export function getDocumentStatus(status: string | undefined) {
  const safeStatus = status ?? "UPLOADED";

  const toneByStatus = {
    UPLOADED: "neutral",
    OCR_PENDING: "warning",
    OCR_RUNNING: "warning",
    OCR_DONE: "info",
    OCR_FAILED: "danger",
    AI_PENDING: "warning",
    AI_RUNNING: "warning",
    AI_DONE: "info",
    AI_FAILED: "danger",
    PENDING_REVIEW: "warning",
    APPROVED: "success",
    FILED: "success",
    REJECTED: "danger",
  } as const;

  return {
    value: safeStatus,
    label: safeStatus.replace(/_/g, " "),
    tone: toneByStatus[safeStatus as keyof typeof toneByStatus] ?? "neutral",
  };
}
