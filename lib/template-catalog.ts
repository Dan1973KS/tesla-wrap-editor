export const SOURCE_REPO = "teslamotors/custom-wraps";
export const SOURCE_COMMIT = "86c7d31454caf0f20af6f6af105f577643f13bce";
const RAW_BASE_URL = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_COMMIT}`;

export type ExampleWrapDefinition = {
  id: string;
  label: string;
  fileName: string;
  imageUrl: string;
};

export type TemplateDefinition = {
  id: string;
  family: string;
  label: string;
  trim: string;
  directory: string;
  notes?: string;
  templateUrl: string;
  previewUrl: string;
  examples: ExampleWrapDefinition[];
};

function formatExampleLabel(fileName: string) {
  return fileName.replace(/\.png$/i, "").replace(/[_-]+/g, " ");
}

function buildExampleWraps(directory: string, fileNames: readonly string[]): ExampleWrapDefinition[] {
  return fileNames.map((fileName) => ({
    id: `${directory}/${fileName}`,
    label: formatExampleLabel(fileName),
    fileName,
    imageUrl: `${RAW_BASE_URL}/${directory}/example/${fileName}`,
  }));
}

const SHARED_EXAMPLE_FILES = [
  "Acid_Drip.png",
  "Ani.png",
  "Apocalypse.png",
  "Avocado_Green.png",
  "Camo.png",
  "Cosmic_Burst.png",
  "Divide.png",
  "Doge.png",
  "Dot_Matrix.png",
  "Ice_Cream.png",
  "Leopard.png",
  "Pixel_Art.png",
  "Reindeer.png",
  "Rudi.png",
  "Sakura.png",
  "Sketch.png",
  "String_Lights.png",
  "Valentine.png",
  "Vintage_Gradient.png",
  "Vintage_Stripes.png",
] as const;

const CYBERTRUCK_EXAMPLE_FILES = [
  "Ani.png",
  "Camo_Blue.png",
  "Camo_Brown.png",
  "Camo_Green.png",
  "Camo_Pink.png",
  "Camo_Sand.png",
  "Camo_Snow.png",
  "Camo_Stealth.png",
  "Clay.png",
  "Cosmic_Burst.png",
  "Digital_Camo_Green.png",
  "Digital_Camo_Snow.png",
  "Digital_Camo_Stealth.png",
  "Doge_Camo.png",
  "Gradient_Black.png",
  "Gradient_Burn.png",
  "Gradient_Cotton_Candy.png",
  "Gradient_Green.png",
  "Gradient_Purple_Burn.png",
  "Gradient_Sunburst.png",
  "Graffiti_back.png",
  "Graffiti_green.png",
  "Graffiti_orange.png",
  "Grandmas_Sofa.png",
  "Houndstooth.png",
  "Leopard.png",
  "Mika.png",
  "Rc_prototype.png",
  "Retro.png",
  "Rudi.png",
  "Rust.png",
  "Valentine.png",
  "Woody.png",
  "Xmas_Camo.png",
  "Xmas_Lights.png",
  "Xray.png",
] as const;

const MODELS_2025_PLAID_EXAMPLE_FILES = [
  "Acid_Drip.png",
  "Alpha_Mask.png",
  "Ani.png",
  "Apocalypse.png",
  "Avocado_Green.png",
  "Camo.png",
  "Cosmic_Burst.png",
  "Divide.png",
  "Doge.png",
  "Dot_Matrix.png",
  "Ice_Cream.png",
  "Leopard.png",
  "Pixel_Art.png",
  "Reindeer.png",
  "Rudi.png",
  "Sakura.png",
  "Sketch.png",
  "String_Lights.png",
  "Valentine.png",
  "Vintage_Gradient.png",
  "Vintage_Stripes.png",
] as const;

const buildTemplate = (
  id: string,
  family: string,
  label: string,
  trim: string,
  directory: string,
  notes?: string,
  exampleFileNames: readonly string[] = [],
): TemplateDefinition => ({
  id,
  family,
  label,
  trim,
  directory,
  notes,
  templateUrl: `${RAW_BASE_URL}/${directory}/template.png`,
  previewUrl: `${RAW_BASE_URL}/${directory}/vehicle_image.png`,
  examples: buildExampleWraps(directory, exampleFileNames),
});

export const templateCatalog: TemplateDefinition[] = [
  buildTemplate("cybertruck", "Cybertruck", "Cybertruck", "All trims", "cybertruck", undefined, CYBERTRUCK_EXAMPLE_FILES),
  buildTemplate("model3", "Model 3", "Model 3", "Legacy", "model3", undefined, SHARED_EXAMPLE_FILES),
  buildTemplate(
    "model3-2024-base",
    "Model 3",
    "Model 3 (2024+)",
    "Standard & Premium",
    "model3-2024-base",
    undefined,
    SHARED_EXAMPLE_FILES,
  ),
  buildTemplate(
    "model3-2024-performance",
    "Model 3",
    "Model 3 (2024+)",
    "Performance",
    "model3-2024-performance",
    undefined,
    SHARED_EXAMPLE_FILES,
  ),
  buildTemplate("modely", "Model Y", "Model Y", "Legacy", "modely", undefined, SHARED_EXAMPLE_FILES),
  buildTemplate(
    "modely-2025-base",
    "Model Y",
    "Model Y (2025+)",
    "Standard",
    "modely-2025-base",
    undefined,
    SHARED_EXAMPLE_FILES,
  ),
  buildTemplate(
    "modely-2025-premium",
    "Model Y",
    "Model Y (2025+)",
    "Premium",
    "modely-2025-premium",
    undefined,
    SHARED_EXAMPLE_FILES,
  ),
  buildTemplate(
    "modely-2025-performance",
    "Model Y",
    "Model Y (2025+)",
    "Performance",
    "modely-2025-performance",
    undefined,
    SHARED_EXAMPLE_FILES,
  ),
  buildTemplate("modely-l", "Model Y", "Model Y L", "Extended", "modely-l", undefined, SHARED_EXAMPLE_FILES),
  buildTemplate("models-2021", "Model S", "Model S (2021+)", "All trims", "models-2021", undefined, SHARED_EXAMPLE_FILES),
  buildTemplate(
    "models-2025-plaid",
    "Model S",
    "Model S (2025+)",
    "Plaid",
    "models-2025-plaid",
    undefined,
    MODELS_2025_PLAID_EXAMPLE_FILES,
  ),
  buildTemplate("modelx-2021", "Model X", "Model X (2021+)", "All trims", "modelx-2021", undefined, SHARED_EXAMPLE_FILES),
];

export const defaultTemplateId = templateCatalog[0]?.id ?? "cybertruck";

export const templateFamilies = Array.from(new Set(templateCatalog.map((template) => template.family)));

export function findTemplateById(templateId: string) {
  return templateCatalog.find((template) => template.id === templateId) ?? templateCatalog[0];
}

export function getTemplatesByFamily(family: string) {
  return templateCatalog.filter((template) => template.family === family);
}

export function getExampleWrapsByTemplateId(templateId: string) {
  return findTemplateById(templateId)?.examples ?? [];
}
