/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WrapEditor } from "@/components/wrap-editor";

function createCanvasContextMock() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(1024 * 1024 * 4).fill(255),
      width: 1024,
      height: 1024,
      colorSpace: "srgb",
    } as unknown as ImageData)),
    putImageData: vi.fn(),
    setTransform: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
  } satisfies Partial<CanvasRenderingContext2D>;
}

class MockImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  crossOrigin = "";
  naturalWidth = 1024;
  naturalHeight = 1024;
  #src = "";

  set src(value: string) {
    this.#src = value;
    queueMicrotask(() => this.onload?.());
  }

  get src() {
    return this.#src;
  }
}

describe("WrapEditor export flow", () => {
  const clickSpy = vi.fn();
  const createObjectURLSpy = vi.fn(() => "blob:mock-url");
  const revokeObjectURLSpy = vi.fn();
  let lastDownloadName = "";

  beforeEach(() => {
    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => createCanvasContextMock() as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob([new Uint8Array(32)], { type: "image/png" }));
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      lastDownloadName = this.download;
      clickSpy();
    });
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clickSpy.mockReset();
    lastDownloadName = "";
    createObjectURLSpy.mockClear();
    revokeObjectURLSpy.mockClear();
  });

  it("blocks export when the filename is blank", async () => {
    render(<WrapEditor />);

    await waitFor(() => expect(screen.getByText(/Loaded Cybertruck/i)).toBeTruthy());

    fireEvent.change(screen.getByLabelText(/Filename/i), { target: { value: "" } });
    fireEvent.click(screen.getAllByRole("button", { name: /Download PNG/i })[0]);

    await waitFor(() => expect(screen.getByText(/Enter a filename before exporting/i)).toBeTruthy());
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("downloads a png when export succeeds", async () => {
    render(<WrapEditor />);

    await waitFor(() => expect(screen.getByText(/Loaded Cybertruck/i)).toBeTruthy());

    fireEvent.click(screen.getAllByRole("button", { name: /Download PNG/i })[0]);

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Exported cybertruck\.png/i)).toBeTruthy());
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(lastDownloadName).toBe("cybertruck.png");
  });
});
