"use client";

import { type ChangeEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { artworkPresets, paintPreset } from "@/lib/pattern-presets";
import {
  buildDownloadName,
  sanitizeFilenameBase,
  TESLA_EXPORT_RULES,
  validateExportBlob,
  validateExportRequest,
} from "@/lib/export-validation";
import {
  defaultTemplateId,
  findTemplateById,
  getTemplatesByFamily,
  SOURCE_COMMIT,
  SOURCE_REPO,
  templateCatalog,
  templateFamilies,
} from "@/lib/template-catalog";

type ArtworkSource = "none" | "upload" | "preset";

type TransformState = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

const EXPORT_SIZES = [512, 768, 1024] as const;
const PREVIEW_SIZE = 1024;
const DEFAULT_TRANSFORM: TransformState = { x: 0, y: 0, scale: 1, rotation: 0 };

type DragState = {
  pointerId: number;
  x: number;
  y: number;
};

function fitWithinSquare(width: number, height: number, size: number) {
  const scale = Math.min(size / width, size / height);
  const renderWidth = width * scale;
  const renderHeight = height * scale;
  return {
    x: (size - renderWidth) / 2,
    y: (size - renderHeight) / 2,
    width: renderWidth,
    height: renderHeight,
  };
}

async function loadImage(src: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });

  return image;
}

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error(`Unable to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function createMaskCanvas(templateImage: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = PREVIEW_SIZE;
  canvas.height = PREVIEW_SIZE;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return canvas;
  }

  const placement = fitWithinSquare(templateImage.naturalWidth, templateImage.naturalHeight, PREVIEW_SIZE);
  ctx.drawImage(templateImage, placement.x, placement.y, placement.width, placement.height);

  const imageData = ctx.getImageData(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
    const alpha = data[index + 3];
    const maskAlpha = brightness > 220 ? alpha : 0;

    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
    data[index + 3] = maskAlpha;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function drawArtworkLayer(
  ctx: CanvasRenderingContext2D,
  source: ArtworkSource,
  transform: TransformState,
  uploadImage: HTMLImageElement | null,
  presetId: string,
) {
  if (source === "none") {
    return;
  }

  ctx.save();
  ctx.translate(PREVIEW_SIZE / 2 + transform.x, PREVIEW_SIZE / 2 + transform.y);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(transform.scale, transform.scale);

  const maxBox = PREVIEW_SIZE * 0.72;

  if (source === "upload" && uploadImage) {
    const ratio = Math.min(maxBox / uploadImage.naturalWidth, maxBox / uploadImage.naturalHeight);
    const width = uploadImage.naturalWidth * ratio;
    const height = uploadImage.naturalHeight * ratio;
    ctx.drawImage(uploadImage, -width / 2, -height / 2, width, height);
  }

  if (source === "preset") {
    ctx.save();
    ctx.translate(-maxBox / 2, -maxBox / 2);
    paintPreset(ctx, presetId, maxBox, maxBox);
    ctx.restore();
  }

  ctx.restore();
}

function drawComposition(options: {
  canvas: HTMLCanvasElement;
  templateImage: HTMLImageElement;
  maskCanvas: HTMLCanvasElement;
  uploadImage: HTMLImageElement | null;
  source: ArtworkSource;
  presetId: string;
  transform: TransformState;
}) {
  const { canvas, maskCanvas, presetId, source, templateImage, transform, uploadImage } = options;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  const displayWidth = canvas.clientWidth || canvas.width;
  const displayHeight = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(displayWidth * ratio);
  canvas.height = Math.round(displayHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  const renderCanvas = document.createElement("canvas");
  renderCanvas.width = PREVIEW_SIZE;
  renderCanvas.height = PREVIEW_SIZE;
  const renderCtx = renderCanvas.getContext("2d");

  if (!renderCtx) {
    return;
  }

  renderCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

  if (source !== "none") {
    const artworkCanvas = document.createElement("canvas");
    artworkCanvas.width = PREVIEW_SIZE;
    artworkCanvas.height = PREVIEW_SIZE;
    const artworkCtx = artworkCanvas.getContext("2d");

    if (artworkCtx) {
      drawArtworkLayer(artworkCtx, source, transform, uploadImage, presetId);
      artworkCtx.globalCompositeOperation = "destination-in";
      artworkCtx.drawImage(maskCanvas, 0, 0);
      renderCtx.drawImage(artworkCanvas, 0, 0);
    }
  }

  const placement = fitWithinSquare(templateImage.naturalWidth, templateImage.naturalHeight, PREVIEW_SIZE);
  renderCtx.globalAlpha = 0.92;
  renderCtx.drawImage(templateImage, placement.x, placement.y, placement.width, placement.height);
  renderCtx.globalAlpha = 1;

  ctx.drawImage(renderCanvas, 0, 0, displayWidth, displayHeight);
}

function renderExportBlob(options: {
  templateImage: HTMLImageElement | null;
  maskCanvas: HTMLCanvasElement;
  uploadImage: HTMLImageElement | null;
  source: ArtworkSource;
  presetId: string;
  transform: TransformState;
  outputSize: number;
}) {
  const { maskCanvas, outputSize, presetId, source, templateImage, transform, uploadImage } = options;
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = outputSize;
  exportCanvas.height = outputSize;
  const ctx = exportCanvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create export canvas.");
  }

  const scaledTemplate = document.createElement("canvas");
  scaledTemplate.width = PREVIEW_SIZE;
  scaledTemplate.height = PREVIEW_SIZE;
  const previewCtx = scaledTemplate.getContext("2d");

  if (!previewCtx) {
    throw new Error("Unable to prepare export preview.");
  }

  if (source !== "none") {
    const artworkCanvas = document.createElement("canvas");
    artworkCanvas.width = PREVIEW_SIZE;
    artworkCanvas.height = PREVIEW_SIZE;
    const artworkCtx = artworkCanvas.getContext("2d");

    if (artworkCtx) {
      drawArtworkLayer(artworkCtx, source, transform, uploadImage, presetId);
      artworkCtx.globalCompositeOperation = "destination-in";
      artworkCtx.drawImage(maskCanvas, 0, 0);
      previewCtx.drawImage(artworkCanvas, 0, 0);
    }
  }

  if (templateImage) {
    const placement = fitWithinSquare(templateImage.naturalWidth, templateImage.naturalHeight, PREVIEW_SIZE);
    previewCtx.globalAlpha = 0.92;
    previewCtx.drawImage(templateImage, placement.x, placement.y, placement.width, placement.height);
    previewCtx.globalAlpha = 1;
  }

  ctx.drawImage(scaledTemplate, 0, 0, outputSize, outputSize);

  return new Promise<Blob>((resolve, reject) => {
    exportCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to encode the PNG export."));
        return;
      }
      resolve(blob);
    }, TESLA_EXPORT_RULES.mimeType);
  });
}

export function WrapEditor() {
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const [artworkSource, setArtworkSource] = useState<ArtworkSource>("preset");
  const [selectedPresetId, setSelectedPresetId] = useState(artworkPresets[0]?.id ?? "midnight");
  const [uploadImage, setUploadImage] = useState<HTMLImageElement | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM);
  const [exportName, setExportName] = useState(() => sanitizeFilenameBase(defaultTemplateId) || "tesla-wrap");
  const [outputSize, setOutputSize] = useState<number>(1024);
  const [statusMessage, setStatusMessage] = useState("Choose a template and artwork to start previewing.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRegionRef = useRef<HTMLDivElement | null>(null);

  const selectedTemplate = useMemo(() => findTemplateById(selectedTemplateId), [selectedTemplateId]);
  const catalogError = "No templates are configured. Add at least one entry to the template catalog.";
  const effectiveStatusMessage = selectedTemplate ? statusMessage : "Template catalog is empty.";
  const activeErrorMessage = selectedTemplate ? errorMessage : catalogError;
  const groupedTemplates = useMemo(
    () => templateFamilies.map((family) => ({ family, options: getTemplatesByFamily(family) })),
    [],
  );

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    let cancelled = false;

    loadImage(selectedTemplate.templateUrl)
      .then((image) => {
        if (cancelled) {
          return;
        }

        setTemplateImage(image);
        setMaskCanvas(createMaskCanvas(image));
        setErrorMessage(null);
        setStatusMessage(`Loaded ${selectedTemplate.label} — ${selectedTemplate.trim}.`);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load the selected template.";
        setTemplateImage(null);
        setMaskCanvas(null);
        setErrorMessage(message);
        setStatusMessage("Template load failed.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsTemplateLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTemplate]);

  useEffect(() => {
    if (!templateImage || !maskCanvas || !previewCanvasRef.current) {
      return;
    }

    drawComposition({
      canvas: previewCanvasRef.current,
      templateImage,
      maskCanvas,
      uploadImage,
      source: artworkSource,
      presetId: selectedPresetId,
      transform,
    });
  }, [artworkSource, maskCanvas, previewVersion, selectedPresetId, templateImage, transform, uploadImage]);

  useEffect(() => {
    if (!previewRegionRef.current) {
      return;
    }

    const observer = new ResizeObserver(() => setPreviewVersion((current) => current + 1));
    observer.observe(previewRegionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const image = await loadImage(dataUrl);
      setUploadImage(image);
      setUploadName(file.name);
      setArtworkSource("upload");
      setStatusMessage(`Loaded upload: ${file.name}`);
      setErrorMessage(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to load the uploaded image.";
      setErrorMessage(message);
    }
  }, []);

  const updateTransform = useCallback((key: keyof TransformState, value: number) => {
    setTransform((current) => ({ ...current, [key]: value }));
  }, []);

  const resetArtwork = useCallback(() => {
    setUploadImage(null);
    setUploadName("");
    setArtworkSource("none");
    setTransform(DEFAULT_TRANSFORM);
    setStatusMessage("Artwork reset. Select a preset or upload a new image.");
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (artworkSource === "none") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({ pointerId: event.pointerId, x: event.clientX, y: event.clientY });
  }, [artworkSource]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId || !previewRegionRef.current) {
      return;
    }

    const rect = previewRegionRef.current.getBoundingClientRect();
    const deltaX = ((event.clientX - dragState.x) / rect.width) * PREVIEW_SIZE;
    const deltaY = ((event.clientY - dragState.y) / rect.height) * PREVIEW_SIZE;

    setTransform((current) => ({ ...current, x: current.x + deltaX, y: current.y + deltaY }));
    setDragState({ pointerId: event.pointerId, x: event.clientX, y: event.clientY });
  }, [dragState]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setDragState(null);
    }
  }, [dragState]);

  const handleExport = useCallback(async () => {
    if (!templateImage || !maskCanvas) {
      setErrorMessage("The template must finish loading before export.");
      return;
    }

    const issues = validateExportRequest(exportName, outputSize);
    if (issues.length > 0) {
      setErrorMessage(issues.join(" "));
      return;
    }

    try {
      setIsExporting(true);
      setErrorMessage(null);
      const blob = await renderExportBlob({
        templateImage,
        maskCanvas,
        uploadImage,
        source: artworkSource,
        presetId: selectedPresetId,
        transform,
        outputSize,
      });

      const blobIssues = validateExportBlob(blob);
      if (blobIssues.length > 0) {
        setErrorMessage(blobIssues.join(" "));
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = buildDownloadName(exportName);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      setStatusMessage(`Exported ${buildDownloadName(exportName)} (${Math.round(blob.size / 1024)} KB).`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Export failed.";
      setErrorMessage(message);
    } finally {
      setIsExporting(false);
    }
  }, [artworkSource, exportName, maskCanvas, outputSize, selectedPresetId, templateImage, transform, uploadImage]);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Tesla Paint Shop-ready PNG prep</p>
          <h1>Tesla Wrap Editor</h1>
          <p className="hero-copy">
            Build a 2D wrap concept against Tesla&apos;s published templates, then export a PNG that follows the documented
            filename, size, and dimension limits.
          </p>
        </div>
        <div className="hero-note">
          <strong>V1 limitation:</strong> export uses a light-pixel masking approximation derived from the source template.
          It is reliable for previewing and PNG prep, but it is not a true Tesla 3D or vehicle-side renderer.
        </div>
      </section>

      <section className="layout-grid">
        <aside className="panel stack-gap" aria-label="Editor settings">
          <div className="stack-gap-sm">
            <h2>1. Select a template</h2>
            <label className="field-label" htmlFor="template-select">
              Vehicle template
            </label>
            <select
              id="template-select"
              className="field-input"
              value={selectedTemplateId}
              onChange={(event) => {
                setIsTemplateLoading(true);
                setTemplateImage(null);
                setMaskCanvas(null);
                setErrorMessage(null);
                setStatusMessage("Loading template…");
                setTransform(DEFAULT_TRANSFORM);
                setExportName(sanitizeFilenameBase(event.target.value) || "tesla-wrap");
                setSelectedTemplateId(event.target.value);
              }}
            >
              {groupedTemplates.map((group) => (
                <optgroup key={group.family} label={group.family}>
                  {group.options.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label} — {template.trim}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="field-help">
              Source: <code>{SOURCE_REPO}</code> @ <code>{SOURCE_COMMIT.slice(0, 7)}</code> with {templateCatalog.length} curated templates. Add more entries in
              <code> /lib/template-catalog.ts</code>.
            </p>
          </div>

          <div className="stack-gap-sm">
            <h2>2. Choose wrap artwork</h2>
            <div className="tab-row" aria-label="Artwork source">
              <button
                type="button"
                className={artworkSource === "preset" ? "tab-button active" : "tab-button"}
                aria-pressed={artworkSource === "preset"}
                onClick={() => setArtworkSource("preset")}
              >
                Generated presets
              </button>
              <button
                type="button"
                className={artworkSource === "upload" ? "tab-button active" : "tab-button"}
                aria-pressed={artworkSource === "upload"}
                onClick={() => setArtworkSource("upload")}
              >
                Upload image
              </button>
            </div>

            {artworkSource === "upload" ? (
              <div className="stack-gap-xs">
                <label className="field-label" htmlFor="artwork-upload">
                  Upload artwork image
                </label>
                <input id="artwork-upload" className="field-input" type="file" accept="image/*" onChange={handleUpload} />
                <p className="field-help">Use a high-contrast image for the clearest masked preview.</p>
                {uploadName ? <p className="pill">Current upload: {uploadName}</p> : null}
              </div>
            ) : (
              <div className="preset-grid">
                {artworkPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={selectedPresetId === preset.id ? "preset-button active" : "preset-button"}
                    aria-pressed={selectedPresetId === preset.id}
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setArtworkSource("preset");
                    }}
                  >
                    <span>{preset.label}</span>
                    <small>{preset.description}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="stack-gap-sm">
            <h2>3. Adjust placement</h2>
            <div className="control-grid">
              <label>
                <span>X offset</span>
                <input type="range" min={-420} max={420} value={transform.x} onChange={(event) => updateTransform("x", Number(event.target.value))} />
              </label>
              <label>
                <span>Y offset</span>
                <input type="range" min={-420} max={420} value={transform.y} onChange={(event) => updateTransform("y", Number(event.target.value))} />
              </label>
              <label>
                <span>Scale</span>
                <input type="range" min={0.3} max={2.2} step={0.01} value={transform.scale} onChange={(event) => updateTransform("scale", Number(event.target.value))} />
              </label>
              <label>
                <span>Rotation</span>
                <input type="range" min={-180} max={180} value={transform.rotation} onChange={(event) => updateTransform("rotation", Number(event.target.value))} />
              </label>
            </div>
            <div className="action-row">
              <button type="button" className="secondary-button" onClick={() => setTransform(DEFAULT_TRANSFORM)}>
                Reset transform
              </button>
              <button type="button" className="secondary-button" onClick={resetArtwork}>
                Clear artwork
              </button>
            </div>
            <p className="field-help">Tip: drag directly on the preview to reposition your artwork.</p>
          </div>

          <div className="stack-gap-sm">
            <h2>4. Export PNG</h2>
            <label className="field-label" htmlFor="export-name">
              Filename
            </label>
            <input
              id="export-name"
              className="field-input"
              maxLength={TESLA_EXPORT_RULES.maxNameLength}
              value={exportName}
              onChange={(event) => setExportName(sanitizeFilenameBase(event.target.value))}
            />
            <label className="field-label" htmlFor="export-size">
              Output size
            </label>
            <select
              id="export-size"
              className="field-input"
              value={outputSize}
              onChange={(event) => setOutputSize(Number(event.target.value))}
            >
              {EXPORT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} × {size}
                </option>
              ))}
            </select>
            <button type="button" className="primary-button" onClick={handleExport} disabled={isExporting || isTemplateLoading || !selectedTemplate}>
              {isExporting ? "Exporting…" : "Download PNG"}
            </button>
            <p className="field-help">
              Tesla documents PNG-only exports between 512 and 1024 pixels square, 1 MB max, and safe names up to 30 characters.
            </p>
          </div>
        </aside>

        <section className="panel workspace-panel">
          <div className="workspace-header">
            <div>
              <h2>Workspace preview</h2>
              <p>
                {selectedTemplate?.label} — {selectedTemplate?.trim}
              </p>
            </div>
{selectedTemplate ? (
            <a href={selectedTemplate.previewUrl} target="_blank" rel="noreferrer" className="inline-link">
              Open upstream vehicle reference
            </a>
          ) : null}
          </div>

          <p id="preview-instructions" className="sr-only">
            Drag inside the preview with a mouse or touch pointer to reposition artwork. Keyboard and assistive technology
            users can use the X and Y offset sliders in step 3 for the same adjustment.
          </p>
          <div
            ref={previewRegionRef}
            className="preview-region"
            role="group"
            tabIndex={0}
            aria-label="Wrap preview workspace"
            aria-describedby="preview-instructions"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {isTemplateLoading ? <div className="overlay-card">Loading template…</div> : null}
            {activeErrorMessage ? <div className="overlay-card error">{activeErrorMessage}</div> : null}
            {artworkSource === "none" && !isTemplateLoading && !activeErrorMessage ? (
              <div className="overlay-card subtle">Select a preset or upload artwork to fill the masked area.</div>
            ) : null}
            <canvas ref={previewCanvasRef} className="preview-canvas" aria-hidden="true" />
          </div>

          <div className="status-grid" aria-live="polite">
            <div>
              <strong>Status</strong>
              <p>{effectiveStatusMessage}</p>
            </div>
            <div>
              <strong>Notes</strong>
              <p>
                The preview is a flattened 2D approximation using the source template. Final in-car appearance depends on Tesla&apos;s own Paint Shop mapping.
              </p>
            </div>
          </div>
        </section>
      </section>

      <section className="panel info-panel">
        <h2>How to use this editor</h2>
        <ol>
          <li>Pick the Tesla model/trim that matches your vehicle.</li>
          <li>Choose a generated finish or upload your own artwork.</li>
          <li>Drag the artwork in the preview, then refine with scale and rotation controls.</li>
          <li>Export a PNG and upload it through Tesla&apos;s Paint Shop workflow.</li>
        </ol>
      </section>

      <footer className="footer-copy">
        This editor is an independent 2D implementation that uses Tesla&apos;s published wrap templates. It does not call Tesla APIs and does not require vehicle access.
      </footer>
    </main>
  );
}
