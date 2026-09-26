import { describe, expect, it } from "vitest";
import {
  defaultTemplateId,
  findTemplateById,
  getExampleWrapsByTemplateId,
  getTemplatesByFamily,
  SOURCE_COMMIT,
  SOURCE_REPO,
  templateCatalog,
  templateFamilies,
} from "@/lib/template-catalog";

describe("template catalog", () => {
  it("covers the source repo families and builds raw asset urls", () => {
    expect(templateCatalog).toHaveLength(12);
    expect(templateFamilies).toEqual(["Cybertruck", "Model 3", "Model Y", "Model S", "Model X"]);
    expect(templateCatalog.every((template) => template.templateUrl.includes(SOURCE_REPO))).toBe(true);
    expect(templateCatalog.every((template) => template.templateUrl.includes(SOURCE_COMMIT))).toBe(true);
  });

  it("looks up templates and keeps a safe default", () => {
    expect(defaultTemplateId).toBe("cybertruck");
    expect(findTemplateById("modely-2025-performance")?.trim).toBe("Performance");
    expect(findTemplateById("missing")?.id).toBe(defaultTemplateId);
  });

  it("groups variants by family", () => {
    const modelY = getTemplatesByFamily("Model Y");
    expect(modelY.map((template) => template.id)).toEqual([
      "modely",
      "modely-2025-base",
      "modely-2025-premium",
      "modely-2025-performance",
      "modely-l",
    ]);
  });

  it("keeps example wraps scoped to each template directory", () => {
    const cybertruckExamples = getExampleWrapsByTemplateId("cybertruck");
    const model3Examples = getExampleWrapsByTemplateId("model3");
    const plaidExamples = getExampleWrapsByTemplateId("models-2025-plaid");

    expect(cybertruckExamples).toHaveLength(36);
    expect(cybertruckExamples.some((example) => example.fileName === "Graffiti_orange.png")).toBe(true);
    expect(cybertruckExamples.every((example) => example.imageUrl.includes("/cybertruck/example/"))).toBe(true);
    expect(model3Examples).toHaveLength(20);
    expect(model3Examples.some((example) => example.fileName === "Graffiti_orange.png")).toBe(false);
    expect(model3Examples.every((example) => example.imageUrl.includes("/model3/example/"))).toBe(true);
    expect(plaidExamples.some((example) => example.fileName === "Alpha_Mask.png")).toBe(true);
  });
});
