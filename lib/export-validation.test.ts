import { describe, expect, it } from "vitest";
import {
  buildDownloadName,
  sanitizeFilenameBase,
  TESLA_EXPORT_RULES,
  validateExportBlob,
  validateExportDimensions,
  validateExportRequest,
  validateFilenameBase,
} from "@/lib/export-validation";

describe("export validation", () => {
  it("sanitizes unsafe filenames and trims length", () => {
    expect(sanitizeFilenameBase("  my*wrap?.png  ")).toBe("mywrap");
    expect(sanitizeFilenameBase("a".repeat(40))).toHaveLength(TESLA_EXPORT_RULES.maxNameLength);
  });

  it("rejects invalid names and sizes", () => {
    expect(validateFilenameBase("bad/name")).toContain(
      "Filename can only contain letters, numbers, spaces, underscores, and dashes.",
    );
    expect(validateExportDimensions(2048)).toContain(
      "Export size must be between 512px and 1024px.",
    );
    expect(validateExportRequest("", 256)).toEqual([
      "Enter a filename before exporting.",
      "Export size must be between 512px and 1024px.",
    ]);
  });

  it("accepts valid png blobs and names exported for download", () => {
    const blob = new Blob([new Uint8Array(16)], { type: "image/png" });
    expect(validateExportBlob(blob)).toEqual([]);
    expect(buildDownloadName("Road Runner")).toBe("Road Runner.png");
  });

  it("rejects oversized or non-png blobs", () => {
    const bigBlob = new Blob([new Uint8Array(TESLA_EXPORT_RULES.maxBytes + 1)], { type: "image/png" });
    const jpgBlob = new Blob([new Uint8Array(20)], { type: "image/jpeg" });
    expect(validateExportBlob(bigBlob)).toContain(
      "Exported PNG must be 1 MB or smaller. Try a smaller size or simpler artwork.",
    );
    expect(validateExportBlob(jpgBlob)).toContain("Exported file must be a PNG.");
  });
});
