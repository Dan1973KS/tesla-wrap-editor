export type ArtworkPreset = {
  id: string;
  label: string;
  description: string;
};

export const artworkPresets: ArtworkPreset[] = [
  {
    id: "midnight",
    label: "Midnight Silver",
    description: "Solid metallic-inspired gray.",
  },
  {
    id: "ultra-red",
    label: "Ultra Red",
    description: "High-saturation red finish.",
  },
  {
    id: "sunrise-gradient",
    label: "Sunrise Gradient",
    description: "Warm multi-stop gradient.",
  },
  {
    id: "diagonal-stripes",
    label: "Diagonal Stripes",
    description: "Bold angled stripe pattern.",
  },
  {
    id: "carbon-weave",
    label: "Carbon Weave",
    description: "Dark woven texture approximation.",
  },
];

export function paintPreset(
  ctx: CanvasRenderingContext2D,
  presetId: string,
  width: number,
  height: number,
) {
  switch (presetId) {
    case "midnight": {
      ctx.fillStyle = "#5f6670";
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "ultra-red": {
      ctx.fillStyle = "#a10f1f";
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "sunrise-gradient": {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#f97316");
      gradient.addColorStop(0.5, "#ef4444");
      gradient.addColorStop(1, "#312e81");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "diagonal-stripes": {
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = Math.max(16, width * 0.03);
      for (let offset = -height; offset < width + height; offset += width * 0.18) {
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset - height, height);
        ctx.stroke();
      }
      break;
    }
    case "carbon-weave": {
      ctx.fillStyle = "#111111";
      ctx.fillRect(0, 0, width, height);
      const cell = Math.max(18, width * 0.035);
      for (let row = 0; row < height + cell; row += cell) {
        for (let col = 0; col < width + cell; col += cell) {
          const dark = ((row + col) / cell) % 2 === 0;
          ctx.fillStyle = dark ? "#1f2937" : "#4b5563";
          ctx.fillRect(col, row, cell, cell / 2);
          ctx.fillStyle = dark ? "#4b5563" : "#1f2937";
          ctx.fillRect(col + cell / 2, row + cell / 2, cell, cell / 2);
        }
      }
      break;
    }
    default: {
      ctx.fillStyle = "#9ca3af";
      ctx.fillRect(0, 0, width, height);
      break;
    }
  }
}
