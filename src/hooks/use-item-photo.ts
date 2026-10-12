import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { ImagePipelineError, processPhoto, type ProcessedPhoto } from "@/lib/imagePipeline";
import type { ItemFormInput, ItemFormValues } from "@/lib/item-form";

export type SelectedPhoto = ProcessedPhoto & { previewUrl: string };

// A photo picked in an item form: runs the image pipeline, shows a preview and
// suggests a color. The suggestion only replaces a color the user has not
// picked themselves.
export function useItemPhoto(form: UseFormReturn<ItemFormInput, unknown, ItemFormValues>) {
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Frees the preview's memory when it is replaced or the form goes away.
  const previewUrl = photo?.previewUrl ?? null;
  useEffect(() => {
    return () => {
      if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const suggestedColor = photo?.suggestedColor ?? null;

  async function select(file: File) {
    setError(null);
    setBusy(true);
    try {
      const processed = await processPhoto(file);
      const current = form.getValues("color");
      if (processed.suggestedColor !== null && (current === "" || current === suggestedColor)) {
        form.setValue("color", processed.suggestedColor);
      }
      setPhoto({ ...processed, previewUrl: URL.createObjectURL(processed.photo) });
    } catch (caught) {
      setError(
        caught instanceof ImagePipelineError
          ? caught.message
          : "Das Foto konnte nicht verarbeitet werden. Bitte versuche es erneut.",
      );
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPhoto(null);
    setError(null);
  }

  return { photo, busy, error, setError, suggestedColor, select, reset };
}
