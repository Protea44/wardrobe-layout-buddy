import type { ItemColor } from "@shared/item";

import { suggestColor } from "@/lib/color-suggestion";

export const PHOTO_MAX_EDGE = 1600;
export const THUMBNAIL_MAX_EDGE = 400;
export const WEBP_QUALITY = 0.82;
// Receipts keep more pixels so small print stays legible.
export const RECEIPT_MAX_EDGE = 2400;
export const RECEIPT_JPEG_QUALITY = 0.9;
// Side length of the downscaled center area the color is read from.
const COLOR_SAMPLE_EDGE = 64;

export type ProcessedPhoto = {
  photo: Blob;
  thumbnail: Blob;
  suggestedColor: ItemColor | null;
};

// `message` is German and safe to show to the user.
export class ImagePipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagePipelineError";
  }
}

type Size = { width: number; height: number };

// Scales down so the longest side is at most maxEdge. Never scales up.
export function fitWithin({ width, height }: Size, maxEdge: number): Size {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

type Drawable = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

function sizeOf(image: Drawable): Size {
  if (image instanceof HTMLImageElement) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }
  return { width: image.width, height: image.height };
}

const ENCODE_ERROR = "Das Foto konnte nicht verarbeitet werden. Bitte versuche es erneut.";
const DECODE_ERROR =
  "Dieses Foto kann dein Browser nicht öffnen. Bitte wähle ein JPEG-, PNG- oder WebP-Foto.";

// Applies the EXIF orientation while decoding, because re-encoding drops the tag.
async function decode(file: Blob): Promise<Drawable> {
  if (!file.type.startsWith("image/")) throw new ImagePipelineError(DECODE_ERROR);
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older browsers without createImageBitmap options; <img> also respects orientation.
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } catch {
      throw new ImagePipelineError(DECODE_ERROR);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

// TODO: Cut the garment out of its background before resizing. Has to run
// on the device (e.g. a local model); photos must never go to an external API.
export function removeBackground<T extends Drawable>(image: T): Promise<T> {
  return Promise.resolve(image);
}

function context2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new ImagePipelineError("Dein Browser kann keine Fotos bearbeiten.");
  return context;
}

function draw(image: Drawable, size: Size, source?: Size & { x: number; y: number }) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = context2d(canvas);
  context.imageSmoothingQuality = "high";
  if (source) {
    context.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      size.width,
      size.height,
    );
  } else {
    context.drawImage(image, 0, 0, size.width, size.height);
  }
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

// Drawing onto a canvas and encoding it keeps only the pixels: EXIF and GPS
// data of the original file are gone. Browsers that cannot encode WebP
// (older Safari) fall back to PNG, so JPEG is used instead.
async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await toBlob(canvas, "image/webp", WEBP_QUALITY);
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", WEBP_QUALITY);
  if (jpeg) return jpeg;
  throw new ImagePipelineError(ENCODE_ERROR);
}

// The garment is usually in the middle; the edges are mostly background.
function centerPixels(canvas: HTMLCanvasElement) {
  const source = {
    x: canvas.width / 4,
    y: canvas.height / 4,
    width: canvas.width / 2,
    height: canvas.height / 2,
  };
  const sample = draw(canvas, { width: COLOR_SAMPLE_EDGE, height: COLOR_SAMPLE_EDGE }, source);
  return context2d(sample).getImageData(0, 0, COLOR_SAMPLE_EDGE, COLOR_SAMPLE_EDGE).data;
}

// Turns a picked or captured file into an upload-ready photo and thumbnail.
export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  const decoded = await decode(file);
  try {
    const image = await removeBackground(decoded);
    const original = sizeOf(image);
    if (original.width === 0 || original.height === 0) throw new ImagePipelineError(DECODE_ERROR);

    const photoCanvas = draw(image, fitWithin(original, PHOTO_MAX_EDGE));
    const thumbnailCanvas = draw(photoCanvas, fitWithin(original, THUMBNAIL_MAX_EDGE));
    const [photo, thumbnail] = await Promise.all([encode(photoCanvas), encode(thumbnailCanvas)]);

    return { photo, thumbnail, suggestedColor: suggestColor(centerPixels(photoCanvas)) };
  } finally {
    if ("close" in decoded) decoded.close();
  }
}

const RECEIPT_TYPE_ERROR = "Bitte wähle eine PDF-, JPG- oder PNG-Datei.";

// Readies a receipt for upload. PDFs are sent as they are; photos of receipts
// are re-encoded as JPEG (the receipt upload takes PDF, JPEG and PNG), which
// drops EXIF and GPS data like every other photo.
export async function prepareReceiptFile(file: File): Promise<Blob> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) return file.slice(0, file.size, "application/pdf");
  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    throw new ImagePipelineError(RECEIPT_TYPE_ERROR);
  }

  const decoded = await decode(file);
  try {
    const canvas = draw(decoded, fitWithin(sizeOf(decoded), RECEIPT_MAX_EDGE));
    const jpeg = await toBlob(canvas, "image/jpeg", RECEIPT_JPEG_QUALITY);
    if (!jpeg) throw new ImagePipelineError(ENCODE_ERROR);
    return jpeg;
  } finally {
    if ("close" in decoded) decoded.close();
  }
}
