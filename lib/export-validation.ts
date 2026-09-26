export const TESLA_EXPORT_RULES = {
  minDimension: 512,
  maxDimension: 1024,
  maxBytes: 1_000_000,
  maxNameLength: 30,
  mimeType: "image/png",
} as const;

const SAFE_NAME_PATTERN = /^[A-Za-z0-9 _-]+$/;

export function sanitizeFilenameBase(input: string) {
  const base = input.trim().replace(/\.png$/i, "");
  const sanitized = base.replace(/[^A-Za-z0-9 _-]/g, "").replace(/\s+/g, " ").trim();
  return sanitized.slice(0, TESLA_EXPORT_RULES.maxNameLength);
}

export function validateFilenameBase(name: string) {
  const issues: string[] = [];

  if (!name.trim()) {
    issues.push("Enter a filename before exporting.");
    return issues;
  }

  if (name.length > TESLA_EXPORT_RULES.maxNameLength) {
    issues.push(`Filename must be ${TESLA_EXPORT_RULES.maxNameLength} characters or fewer.`);
  }

  if (!SAFE_NAME_PATTERN.test(name)) {
    issues.push("Filename can only contain letters, numbers, spaces, underscores, and dashes.");
  }

  return issues;
}

export function validateExportDimensions(size: number) {
  const issues: string[] = [];

  if (!Number.isInteger(size)) {
    issues.push("Export size must be a whole number.");
    return issues;
  }

  if (size < TESLA_EXPORT_RULES.minDimension || size > TESLA_EXPORT_RULES.maxDimension) {
    issues.push(
      `Export size must be between ${TESLA_EXPORT_RULES.minDimension}px and ${TESLA_EXPORT_RULES.maxDimension}px.`,
    );
  }

  return issues;
}

export function validateExportBlob(blob: Blob) {
  const issues: string[] = [];

  if (blob.type !== TESLA_EXPORT_RULES.mimeType) {
    issues.push("Exported file must be a PNG.");
  }

  if (blob.size > TESLA_EXPORT_RULES.maxBytes) {
    issues.push("Exported PNG must be 1 MB or smaller. Try a smaller size or simpler artwork.");
  }

  return issues;
}

export function validateExportRequest(name: string, size: number) {
  return [...validateFilenameBase(name), ...validateExportDimensions(size)];
}

export function buildDownloadName(name: string) {
  return `${sanitizeFilenameBase(name) || "tesla-wrap"}.png`;
}
