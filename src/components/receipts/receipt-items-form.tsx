import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, type Control } from "react-hook-form";

import { itemCategories, type ItemCategory } from "@shared/item";
import { RECEIPT_ITEMS_MAX, type ReceiptResponse } from "@shared/receipt";

import { TextField } from "@/components/auth/text-field";
import { SingleChipGroup } from "@/components/items/chip-group";
import { PhotoInput } from "@/components/items/photo-input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { ApiError } from "@/lib/api";
import { ImagePipelineError, processPhoto, type ProcessedPhoto } from "@/lib/imagePipeline";
import {
  emptyReceiptItem,
  emptyReceiptItemsForm,
  receiptItemsFormSchema,
  toReceiptItemsInput,
  type ReceiptItemsFormInput,
  type ReceiptItemsFormValues,
} from "@/lib/receipt-items-form";
import { createReceiptItems, receiptFileUrl } from "@/lib/receipts-api";

const categoryOptions = itemCategories.map((category) => ({ value: category, label: category }));
const UNKNOWN_ERROR = "Die Teile konnten nicht gespeichert werden. Bitte versuche es erneut.";

type BlockPhoto = ProcessedPhoto & { previewUrl: string };
type PhotoState = { photo?: BlockPhoto; busy?: boolean; error?: string };

type ItemBlockProps = {
  index: number;
  control: Control<ReceiptItemsFormInput, unknown, ReceiptItemsFormValues>;
  photo: PhotoState;
  onSelectPhoto: (file: File) => void;
  onRemove: (() => void) | null;
};

function ItemBlock({ index, control, photo, onSelectPhoto, onRemove }: ItemBlockProps) {
  const headingId = `receipt-item-${index}`;

  return (
    <section className="receipt-item-block" aria-labelledby={headingId}>
      <div className="receipt-item-head">
        <h3 id={headingId} className="receipt-item-title">
          Teil {index + 1} aus diesem Beleg
        </h3>
        {onRemove && (
          <Button type="button" variant="ghost" className="h-11 px-3" onClick={onRemove}>
            Entfernen<span className="sr-only">: Teil {index + 1}</span>
          </Button>
        )}
      </div>
      <TextField
        control={control}
        name={`items.${index}.name`}
        label="Name"
        placeholder="z. B. Leinenhemd"
        maxLength={120}
        autoComplete="off"
      />
      <Controller
        control={control}
        name={`items.${index}.category`}
        render={({ field, fieldState }) => (
          <SingleChipGroup
            legend={
              <>
                Kategorie <span className="field-required">(Pflichtfeld)</span>
              </>
            }
            options={categoryOptions}
            value={field.value as ItemCategory | ""}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <div className="receipt-item-grid">
        <TextField
          control={control}
          name={`items.${index}.brand`}
          label="Marke"
          maxLength={80}
          autoComplete="off"
        />
        <TextField
          control={control}
          name={`items.${index}.size`}
          label="Größe"
          maxLength={40}
          autoComplete="off"
        />
        <TextField
          control={control}
          name={`items.${index}.price`}
          label="Preis in €"
          inputMode="decimal"
          placeholder="z. B. 49,90"
          autoComplete="off"
        />
      </div>
      <PhotoInput
        previewUrl={photo.photo?.previewUrl ?? null}
        busy={photo.busy ?? false}
        error={photo.error ?? null}
        onSelect={onSelectPhoto}
        required={false}
      />
    </section>
  );
}

type ReceiptItemsFormProps = {
  receipt: ReceiptResponse;
  onSaved: () => void;
  onCancel: () => void;
};

// Details of an uploaded receipt and the items bought with it.
export function ReceiptItemsForm({ receipt, onSaved, onCancel }: ReceiptItemsFormProps) {
  const form = useForm<ReceiptItemsFormInput, unknown, ReceiptItemsFormValues>({
    resolver: zodResolver(receiptItemsFormSchema),
    defaultValues: emptyReceiptItemsForm,
  });
  const items = useFieldArray({ control: form.control, name: "items" });
  // Keyed by the block's field id, so photos stay with their block on removal.
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Frees every preview when the form goes away.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function updatePhoto(fieldId: string, next: PhotoState) {
    setPhotos((current) => {
      const old = current[fieldId]?.photo?.previewUrl;
      if (old !== undefined && old !== next.photo?.previewUrl) {
        URL.revokeObjectURL(old);
        previews.current.delete(old);
      }
      return { ...current, [fieldId]: next };
    });
  }

  async function selectPhoto(fieldId: string, file: File) {
    const previous = photos[fieldId]?.photo;
    updatePhoto(fieldId, { ...(previous && { photo: previous }), busy: true });
    try {
      const processed = await processPhoto(file);
      const previewUrl = URL.createObjectURL(processed.photo);
      previews.current.add(previewUrl);
      updatePhoto(fieldId, { photo: { ...processed, previewUrl } });
    } catch (error) {
      updatePhoto(fieldId, {
        ...(previous && { photo: previous }),
        error:
          error instanceof ImagePipelineError
            ? error.message
            : "Das Foto konnte nicht verarbeitet werden. Bitte versuche es erneut.",
      });
    }
  }

  function removeBlock(index: number, fieldId: string) {
    items.remove(index);
    updatePhoto(fieldId, {});
  }

  async function save(values: ReceiptItemsFormValues) {
    setSubmitError(null);
    setProgress(0);
    try {
      await createReceiptItems(
        receipt.id,
        toReceiptItemsInput(values),
        items.fields.map(({ id }) => photos[id]?.photo ?? null),
        { onProgress: setProgress },
      );
      onSaved();
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : UNKNOWN_ERROR);
    } finally {
      setProgress(null);
    }
  }

  const uploading = progress !== null;
  const photoBusy = Object.values(photos).some((photo) => photo.busy);
  const percent = Math.round((progress ?? 0) * 100);

  return (
    <Form {...form}>
      <form
        className="item-form"
        onSubmit={form.handleSubmit(save)}
        noValidate
        aria-busy={uploading}
      >
        <p className="receipt-uploaded">
          Beleg hochgeladen.{" "}
          <a href={receiptFileUrl(receipt.fileKey)} target="_blank" rel="noopener noreferrer">
            Beleg ansehen<span className="sr-only"> (öffnet in neuem Tab)</span>
          </a>
        </p>
        <div className="receipt-item-grid">
          <TextField
            control={form.control}
            name="merchant"
            label="Händler"
            maxLength={120}
            autoComplete="off"
          />
          <TextField control={form.control} name="purchaseDate" label="Kaufdatum" type="date" />
        </div>

        {items.fields.map((field, index) => (
          <ItemBlock
            key={field.id}
            index={index}
            control={form.control}
            photo={photos[field.id] ?? {}}
            onSelectPhoto={(file) => void selectPhoto(field.id, file)}
            onRemove={items.fields.length > 1 ? () => removeBlock(index, field.id) : null}
          />
        ))}

        {items.fields.length < RECEIPT_ITEMS_MAX && (
          <Button
            type="button"
            variant="outline"
            className="h-12 text-base"
            onClick={() => items.append(emptyReceiptItem)}
          >
            <Plus aria-hidden="true" />
            Weiteres Teil aus diesem Beleg
          </Button>
        )}

        <div className="item-form-actions">
          {uploading && (
            <div className="upload-progress">
              <Progress value={percent} aria-label="Upload-Fortschritt" />
              <p className="upload-progress-text" aria-hidden="true">
                Wird gespeichert … {percent} %
              </p>
            </div>
          )}
          <p className="sr-only" role="status">
            {uploading ? "Deine Teile werden gespeichert." : ""}
          </p>
          {submitError !== null && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}
          <div className="receipt-form-buttons">
            <Button
              type="button"
              variant="outline"
              className="h-12 text-base"
              disabled={uploading}
              onClick={onCancel}
            >
              Später ergänzen
            </Button>
            <Button
              type="submit"
              className="h-12 flex-1 text-base"
              disabled={uploading || photoBusy}
            >
              {uploading ? "Wird gespeichert …" : "Teile speichern"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
