import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { ItemResponse } from "@shared/item";

import { ItemFields } from "@/components/items/item-fields";
import { PhotoInput } from "@/components/items/photo-input";
import { UploadActions } from "@/components/items/upload-actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useItemPhoto } from "@/hooks/use-item-photo";
import { ApiError } from "@/lib/api";
import {
  hasDetailErrors,
  itemFormSchema,
  itemToFormInput,
  toItemEditInput,
  type ItemFormInput,
  type ItemFormValues,
} from "@/lib/item-form";
import { itemPhotoUrl, replaceItemPhoto, updateItem } from "@/lib/items-api";

const UNKNOWN_ERROR = "Die Änderungen konnten nicht gespeichert werden. Bitte versuche es erneut.";

type ItemEditFormProps = {
  item: ItemResponse;
  onSaved: (item: ItemResponse) => void;
  onCancel: () => void;
};

// The same fields and chips as the add form, filled with the item's values.
export function ItemEditForm({ item, onSaved, onCancel }: ItemEditFormProps) {
  const form = useForm<ItemFormInput, unknown, ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: itemToFormInput(item),
  });
  const photo = useItemPhoto(form);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  // Share of the photo upload done, or null while no photo is uploading.
  const [progress, setProgress] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function save(values: ItemFormValues) {
    setSubmitError(null);
    setSaving(true);
    try {
      let updated = await updateItem(item.id, toItemEditInput(values));
      if (photo.photo !== null) {
        setProgress(0);
        updated = await replaceItemPhoto(
          item.id,
          { photo: photo.photo.photo, thumbnail: photo.photo.thumbnail },
          { onProgress: setProgress },
        );
      }
      onSaved(updated);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : UNKNOWN_ERROR);
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  const storedPhoto = item.photoKey === null ? null : itemPhotoUrl(item.photoKey);

  return (
    <Form {...form}>
      <form
        className="item-form"
        onSubmit={form.handleSubmit(save, (errors) => {
          if (hasDetailErrors(errors)) setDetailsOpen(true);
        })}
        noValidate
        aria-busy={saving}
      >
        <PhotoInput
          previewUrl={photo.photo?.previewUrl ?? storedPhoto}
          busy={photo.busy}
          error={photo.error}
          onSelect={(file) => void photo.select(file)}
        />
        <ItemFields
          form={form}
          suggestedColor={photo.suggestedColor}
          detailsOpen={detailsOpen}
          onDetailsOpenChange={setDetailsOpen}
        />
        <UploadActions progress={progress} error={submitError} status="Dein Foto wird hochgeladen.">
          <div className="receipt-form-buttons">
            <Button
              type="button"
              variant="outline"
              className="h-12 text-base"
              disabled={saving}
              onClick={onCancel}
            >
              Abbrechen
            </Button>
            <Button type="submit" className="h-12 flex-1 text-base" disabled={saving || photo.busy}>
              {saving ? "Wird gespeichert …" : "Speichern"}
            </Button>
          </div>
        </UploadActions>
      </form>
    </Form>
  );
}
