import { describe, expect, it } from "vitest";

import { detectImageType } from "./image-type";

const bytes = (...parts: (string | number[])[]) =>
  Uint8Array.from(
    parts.flatMap((part) =>
      typeof part === "string" ? [...part].map((char) => char.charCodeAt(0)) : part,
    ),
  );

describe("detectImageType", () => {
  it("recognises WebP, JPEG and PNG by their magic bytes", () => {
    expect(detectImageType(bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 "))?.contentType).toBe(
      "image/webp",
    );
    expect(detectImageType(bytes([0xff, 0xd8, 0xff, 0xe0]))?.contentType).toBe("image/jpeg");
    expect(
      detectImageType(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.contentType,
    ).toBe("image/png");
  });

  it("refuses everything else, however it is named", () => {
    expect(detectImageType(bytes("GIF89a"))).toBeNull();
    expect(detectImageType(bytes("RIFF", [1, 2, 3, 4], "WAVE"))).toBeNull();
    expect(detectImageType(bytes("<svg xmlns"))).toBeNull();
    expect(detectImageType(bytes([0xff, 0xd8]))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});
