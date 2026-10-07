import type { ImgHTMLAttributes } from "react";

import { useStoredImageUrl } from "@/lib/offline/images";

type StoredImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  storageKey: string;
  // Shown from the offline cache when the image itself is not stored there.
  fallbackKey?: string | null;
  alt: string;
};

// An item photo that also works offline, from the IndexedDB cache.
export function StoredImage({ storageKey, fallbackKey = null, alt, ...props }: StoredImageProps) {
  const { src, onError } = useStoredImageUrl(storageKey, fallbackKey);
  if (src === null) return null;
  return <img {...props} src={src} alt={alt} onError={onError} />;
}
