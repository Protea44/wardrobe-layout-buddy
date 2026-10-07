import { describe, expect, it } from "vitest";

import { detectImageType, detectReceiptType } from "./file-type";

const bytes = (...parts: (string | number[])[]) =>
  Uint8Array.from(
    parts.flatMap((part) =>
      typeof part === "string" ? [...part].map((char) => char.charCodeAt(0)) : part,
    ),
  );

const webp = bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 ");
const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0]);
const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const pdf = bytes("%PDF-1.7\n");

describe("detectImageType", () => {
  it("recognises WebP, JPEG and PNG by their magic bytes", () => {
    expect(detectImageType(webp)?.contentType).toBe("image/webp");
    expect(detectImageType(jpeg)?.contentType).toBe("image/jpeg");
    expect(detectImageType(png)?.contentType).toBe("image/png");
  });

  it("refuses everything else, however it is named", () => {
    expect(detectImageType(pdf)).toBeNull();
    expect(detectImageType(bytes("GIF89a"))).toBeNull();
    expect(detectImageType(bytes("RIFF", [1, 2, 3, 4], "WAVE"))).toBeNull();
    expect(detectImageType(bytes("<svg xmlns"))).toBeNull();
    expect(detectImageType(bytes([0xff, 0xd8]))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

describe("detectReceiptType", () => {
  it("recognises PDF, JPEG and PNG", () => {
    expect(detectReceiptType(pdf)).toEqual({ contentType: "application/pdf", extension: "pdf" });
    expect(detectReceiptType(jpeg)?.extension).toBe("jpg");
    expect(detectReceiptType(png)?.extension).toBe("png");
  });

  it("refuses WebP and anything else", () => {
    expect(detectReceiptType(webp)).toBeNull();
    expect(detectReceiptType(bytes("<html>"))).toBeNull();
    expect(detectReceiptType(bytes("%PD"))).toBeNull();
  });
});
