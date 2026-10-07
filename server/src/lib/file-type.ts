export type FileType = {
  contentType: "image/webp" | "image/jpeg" | "image/png" | "application/pdf";
  extension: "webp" | "jpg" | "png" | "pdf";
};

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

const ascii = (value: string) => [...value].map((char) => char.charCodeAt(0));

// Tells the real file type from its first bytes. The client's file name and
// content type are never trusted. Null for anything but WebP, JPEG, PNG and PDF.
function detectFileType(bytes: Uint8Array): FileType | null {
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) {
    return { contentType: "image/webp", extension: "webp" };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: "image/png", extension: "png" };
  }
  if (startsWith(bytes, ascii("%PDF-"))) {
    return { contentType: "application/pdf", extension: "pdf" };
  }
  return null;
}

function detectOneOf(bytes: Uint8Array, allowed: readonly FileType["extension"][]) {
  const type = detectFileType(bytes);
  return type !== null && allowed.includes(type.extension) ? type : null;
}

// Item photos and thumbnails: WebP, JPEG or PNG.
export function detectImageType(bytes: Uint8Array) {
  return detectOneOf(bytes, ["webp", "jpg", "png"]);
}

// Receipts: PDF, JPEG or PNG.
export function detectReceiptType(bytes: Uint8Array) {
  return detectOneOf(bytes, ["pdf", "jpg", "png"]);
}
