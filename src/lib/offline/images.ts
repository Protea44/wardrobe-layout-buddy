import { useEffect, useState } from "react";

import { itemPhotoUrl } from "@/lib/items-api";
import { db, isLocalKey } from "@/lib/offline/db";
import { useOnline } from "@/lib/offline/online";

// Downloads an image through the authenticated files route into IndexedDB.
export async function cacheImage(key: string) {
  if (isLocalKey(key) || (await db.images.get(key))) return;
  const response = await fetch(itemPhotoUrl(key), { credentials: "include" });
  if (!response.ok) return;
  await db.images.put({ key, blob: await response.blob() });
}

// Image source for a storage key: the files route while online, the cached
// blob offline, for photos not uploaded yet, or when loading fails. A missing
// cached photo falls back to the cached thumbnail.
export function useStoredImageUrl(key: string | null, fallbackKey: string | null = null) {
  const online = useOnline();
  const [failed, setFailed] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const useCache = key !== null && (!online || failed || isLocalKey(key));

  useEffect(() => {
    if (!useCache || key === null) return;
    let url: string | null = null;
    let cancelled = false;
    void (async () => {
      const cached =
        (await db.images.get(key)) ?? (fallbackKey && (await db.images.get(fallbackKey)));
      if (cancelled || !cached) return;
      url = URL.createObjectURL(cached.blob);
      setBlobUrl(url);
    })();
    return () => {
      cancelled = true;
      if (url !== null) URL.revokeObjectURL(url);
      setBlobUrl(null);
    };
  }, [useCache, key, fallbackKey]);

  useEffect(() => setFailed(false), [key]);

  if (key === null) return { src: null, onError: undefined };
  if (useCache) return { src: blobUrl, onError: undefined };
  return { src: itemPhotoUrl(key), onError: () => setFailed(true) };
}
