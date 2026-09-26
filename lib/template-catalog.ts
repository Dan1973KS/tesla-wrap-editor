export const SOURCE_REPO = "teslamotors/custom-wraps";
export const SOURCE_COMMIT = "86c7d31454caf0f20af6f6af105f577643f13bce";
const RAW_BASE_URL = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_COMMIT}`;

export type TemplateDefinition = {
  id: string;
  family: string;
  label: string;
  trim: string;
  directory: string;
  notes?: string;
  templateUrl: string;
  previewUrl: string;
};

const buildTemplate = (
  id: string,
  family: string,
  label: string,
  trim: string,
  directory: string,
  notes?: string,
): TemplateDefinition => ({
  id,
  family,
  label,
  trim,
  directory,
  notes,
  templateUrl: `${RAW_BASE_URL}/${directory}/template.png`,
  previewUrl: `${RAW_BASE_URL}/${directory}/vehicle_image.png`,
});

export const templateCatalog: TemplateDefinition[] = [
  buildTemplate("cybertruck", "Cybertruck", "Cybertruck", "All trims", "cybertruck"),
  buildTemplate("model3", "Model 3", "Model 3", "Legacy", "model3"),
  buildTemplate(
    "model3-2024-base",
    "Model 3",
    "Model 3 (2024+)",
    "Standard & Premium",
    "model3-2024-base",
  ),
  buildTemplate(
    "model3-2024-performance",
    "Model 3",
    "Model 3 (2024+)",
    "Performance",
    "model3-2024-performance",
  ),
  buildTemplate("modely", "Model Y", "Model Y", "Legacy", "modely"),
  buildTemplate(
    "modely-2025-base",
    "Model Y",
    "Model Y (2025+)",
    "Standard",
    "modely-2025-base",
  ),
  buildTemplate(
    "modely-2025-premium",
    "Model Y",
    "Model Y (2025+)",
    "Premium",
    "modely-2025-premium",
  ),
  buildTemplate(
    "modely-2025-performance",
    "Model Y",
    "Model Y (2025+)",
    "Performance",
    "modely-2025-performance",
  ),
  buildTemplate("modely-l", "Model Y", "Model Y L", "Extended", "modely-l"),
  buildTemplate("models-2021", "Model S", "Model S (2021+)", "All trims", "models-2021"),
  buildTemplate(
    "models-2025-plaid",
    "Model S",
    "Model S (2025+)",
    "Plaid",
    "models-2025-plaid",
  ),
  buildTemplate("modelx-2021", "Model X", "Model X (2021+)", "All trims", "modelx-2021"),
];

export const defaultTemplateId = templateCatalog[0]?.id ?? "cybertruck";

export const templateFamilies = Array.from(new Set(templateCatalog.map((template) => template.family)));

export function findTemplateById(templateId: string) {
  return templateCatalog.find((template) => template.id === templateId) ?? templateCatalog[0];
}

export function getTemplatesByFamily(family: string) {
  return templateCatalog.filter((template) => template.family === family);
}
