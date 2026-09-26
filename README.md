# tesla-wrap-editor

A browser-based 2D Tesla custom-wrap editor built with Next.js and TypeScript.

This project uses published vehicle templates from [`teslamotors/custom-wraps`](https://github.com/teslamotors/custom-wraps) to help you prepare Tesla Paint Shop-compatible PNG assets locally in the browser. It is an independent implementation: it does **not** call Tesla APIs, it does **not** require vehicle access, and it is **not** a 3D renderer.

## Features

- Curated Tesla template catalog covering the vehicle families currently represented in `teslamotors/custom-wraps`
- Browser-based editor workspace for:
  - selecting a Tesla template
  - browsing example wraps from the matching upstream vehicle directory only
  - choosing a generated preset or uploading artwork
  - dragging, scaling, and rotating artwork
  - previewing a flattened 2D composition over the template
- Client-side PNG export flow with Tesla-oriented validation:
  - PNG output only
  - 512×512 to 1024×1024 export sizes
  - 1 MB maximum file size
  - filename-safe names up to 30 characters
- Responsive layout with mobile-friendly controls and accessible labels
- Focused tests for template catalog behavior and export validation logic

## Quick start

### Requirements

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

### Validate

```bash
npm run lint
npm test
npm run build
```

## How it works

1. Select the Tesla vehicle template that matches your model/trim.
2. Choose an example wrap for that vehicle, a generated preset, or upload your own image.
3. Drag artwork directly in the preview and fine-tune with scale/rotation controls.
4. Export a PNG using one of the supported Tesla-friendly square sizes.
5. Upload the exported PNG through Tesla's Paint Shop workflow.

## Architecture

- `app/`
  - Next.js App Router entrypoints and global styling
- `components/wrap-editor.tsx`
  - main editor UI, preview rendering, drag interactions, export flow
- `lib/template-catalog.ts`
  - curated Tesla template catalog and raw asset URLs
- `lib/pattern-presets.ts`
  - generated wrap presets used when no uploaded artwork is provided
- `lib/export-validation.ts`
  - Tesla-oriented export constraints and filename helpers
- `lib/*.test.ts`
  - Vitest coverage for the important pure logic

## Template asset sourcing

The catalog is intentionally small and easy to extend.

- Source repository: `teslamotors/custom-wraps`
- Current pinned source commit: `86c7d31454caf0f20af6f6af105f577643f13bce`
- Asset strategy: stable raw GitHub URLs in `lib/template-catalog.ts`

Each catalog entry points to:

- `template.png`
- `vehicle_image.png`
- zero or more `example/*.png` wrap designs for that same vehicle directory

The editor renders only the example gallery for the vehicle currently selected in the template picker. Switching vehicles replaces the gallery immediately and clears any active example selection from the previous vehicle so stale artwork is not reused by accident.

Because remote assets can change over time, the source commit is pinned. If you want a stronger offline fallback, replace the raw URLs in `lib/template-catalog.ts` with checked-in files under `public/` and keep the same catalog structure.

## Adding another vehicle template

1. Confirm the vehicle directory exists in `teslamotors/custom-wraps`.
2. Add a new `buildTemplate(...)` entry in `lib/template-catalog.ts`.
3. Point it to the directory that contains `template.png`, `vehicle_image.png`, and any `example/*.png` files you want surfaced in the gallery.
4. Add the corresponding example PNG filenames in `lib/template-catalog.ts` so the selected-vehicle gallery can build stable raw URLs for that directory.
5. If the upstream source commit changes, update `SOURCE_COMMIT` after verifying the new asset paths.
6. Run:

```bash
npm test
npm run build
```

## Known limitations

- This is a **2D template editor**, not a Tesla 3D renderer.
- The preview/export masking uses a light-pixel approximation derived from the source template image. That is a practical V1 fallback, but it is not a perfect template-mask reconstruction.
- Final in-car appearance still depends on Tesla's own Paint Shop mapping.
- Remote template availability depends on raw GitHub asset delivery unless you switch the catalog to local files.

## Source template families included

- Cybertruck
- Model 3
- Model Y
- Model S
- Model X

## Testing

The project uses Vitest for focused unit tests covering:

- template catalog coverage and URL generation
- selected-vehicle example gallery filtering and vehicle-switch reset behavior
- export filename, size, and PNG validation rules

Run the test suite with:

```bash
npm test
```

## Deployment notes

This is a standard Next.js application and can be deployed anywhere that supports Next.js builds.

Recommended production verification:

```bash
npm run build
npm run start
```
