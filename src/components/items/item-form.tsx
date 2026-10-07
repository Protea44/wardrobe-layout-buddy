import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { ItemResponse } from "@shared/item";

import { ItemFields } from "@/components/items/item-fields";
import { ItemSaved } from "@/components/items/item-saved";
import { PhotoInput } from "@/components/items/photo-input";
import { UploadActions } from "@/components/items/upload-actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useItemPhoto } from "@/hooks/use-item-photo";
import { ApiError } from "@/lib/api";
import {
  emptyItemForm,
  hasDetailErrors,
  itemFormSchema,
  toItemUploadInput,
  type ItemFormInput,
  type ItemFormValues,
} from "@/lib/item-form";
import { uploadItem } from "@/lib/items-api";

const PHOTO_MISSING = "Bitte füge ein Foto hinzu.";
const UNKNOWN_ERROR = "Das Teil konnte nicht gespeichert werden. Bitte versuche es erneut.";

export function ItemForm() {
  const form = useForm<ItemFormInput, unknown, ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: emptyItemForm,
  });
  const photo = useItemPhoto(form);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Share of the upload done, or null while not uploading.
  const [progress, setProgress] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ItemResponse | null>(null);
  const photoTrigger = useRef<HTMLButtonElement>(null);

  async function save(values: ItemFormValues) {
    if (photo.photo === null) return;
    setSubmitError(null);
    setProgress(0);
    try {
      const item = await uploadItem(
        {
          photo: photo.photo.photo,
          thumbnail: photo.photo.thumbnail,
          fields: toItemUploadInput(values),
        },
        { onProgress: setProgress },
      );
      toast.success("Gespeichert");
      setSaved(item);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : UNKNOWN_ERROR);
    } finally {
      setProgress(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (photo.photo === null) photo.setError(PHOTO_MISSING);
    return form.handleSubmit(save, (errors) => {
      if (hasDetailErrors(errors)) setDetailsOpen(true);
    })(event);
  }

  function startNext() {
    form.reset(emptyItemForm);
    photo.reset();
    setSubmitError(null);
    setDetailsOpen(false);
    setSaved(null);
    window.scrollTo({ top: 0 });
    // Wait for the form to render again before moving focus into it.
    requestAnimationFrame(() => photoTrigger.current?.focus());
  }

  if (saved !== null) return <ItemSaved item={saved} onNext={startNext} />;

  const uploading = progress !== null;

  return (
    <Form {...form}>
      <form className="item-form" onSubmit={handleSubmit} noValidate aria-busy={uploading}>
        <PhotoInput
          previewUrl={photo.photo?.previewUrl ?? null}
          busy={photo.busy}
          error={photo.error}
          onSelect={(file) => void photo.select(file)}
          triggerRef={photoTrigger}
        />
        <ItemFields
          form={form}
          suggestedColor={photo.suggestedColor}
          detailsOpen={detailsOpen}
          onDetailsOpenChange={setDetailsOpen}
        />
        <UploadActions progress={progress} error={submitError} status="Dein Teil wird hochgeladen.">
          <Button
            type="submit"
            className="h-12 w-full text-base"
            disabled={uploading || photo.busy}
          >
            {uploading ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </UploadActions>
      </form>
    </Form>
  );
}
