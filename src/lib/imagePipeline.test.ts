import { describe, expect, it } from "vitest";

import {
  fitWithin,
  ImagePipelineError,
  PHOTO_MAX_EDGE,
  prepareReceiptFile,
  processPhoto,
  removeBackground,
  THUMBNAIL_MAX_EDGE,
} from "@/lib/imagePipeline";

describe("fitWithin", () => {
  it("limits the longest side and keeps the aspect ratio", () => {
    expect(fitWithin({ width: 4000, height: 3000 }, PHOTO_MAX_EDGE)).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(fitWithin({ width: 3000, height: 4000 }, THUMBNAIL_MAX_EDGE)).toEqual({
      width: 300,
      height: 400,
    });
  });

  it("never scales up", () => {
    expect(fitWithin({ width: 800, height: 600 }, PHOTO_MAX_EDGE)).toEqual({
      width: 800,
      height: 600,
    });
  });
});

describe("removeBackground", () => {
  it("returns the image unchanged for now", async () => {
    const canvas = document.createElement("canvas");
    expect(await removeBackground(canvas)).toBe(canvas);
  });
});

describe("processPhoto", () => {
  it("rejects files that are not images with a German message", async () => {
    const error = await processPhoto(new Blob(["%PDF"], { type: "application/pdf" })).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ImagePipelineError);
    expect((error as Error).message).toMatch(/JPEG-, PNG- oder WebP-Foto/);
  });
});

describe("prepareReceiptFile", () => {
  it("passes PDFs through unchanged", async () => {
    const pdf = new File(["%PDF-1.7"], "rechnung.pdf", { type: "application/pdf" });

    const prepared = await prepareReceiptFile(pdf);

    expect(prepared.type).toBe("application/pdf");
    expect(prepared.size).toBe(pdf.size);
  });

  it("refuses other file types with a German message", async () => {
    const error = await prepareReceiptFile(
      new File(["GIF89a"], "beleg.gif", { type: "image/gif" }),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ImagePipelineError);
    expect((error as Error).message).toBe("Bitte wähle eine PDF-, JPG- oder PNG-Datei.");
  });
});
