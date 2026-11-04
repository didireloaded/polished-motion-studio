import { describe, expect, it } from "vitest";
import {
  compressProfilePhoto,
  computeTargetDimensions,
  extensionForMimeType,
} from "./photo-compression";

describe("photo-compression", () => {
  it("preserves dimensions when already within maxDimension", () => {
    expect(computeTargetDimensions(800, 1000, 1200)).toEqual({
      width: 800,
      height: 1000,
      scaled: false,
    });
  });

  it("scales down landscape and portrait images proportionally", () => {
    expect(computeTargetDimensions(2400, 1800, 1200)).toEqual({
      width: 1200,
      height: 900,
      scaled: true,
    });
    expect(computeTargetDimensions(1500, 3000, 1200)).toEqual({
      width: 600,
      height: 1200,
      scaled: true,
    });
  });

  it("maps mime types to storage file extensions", () => {
    expect(extensionForMimeType("image/webp")).toBe("webp");
    expect(extensionForMimeType("image/png")).toBe("png");
    expect(extensionForMimeType("image/jpeg")).toBe("jpg");
  });

  it("falls back safely to the original file when canvas/image decoding is unavailable", async () => {
    const raw = new Uint8Array([137, 80, 78, 71]);
    const file = new File([raw], "portrait.png", { type: "image/png" });
    const result = await compressProfilePhoto(file);
    expect(result).toBe(file);
  });
});
