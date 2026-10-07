import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";

import {
  itemCategories,
  itemColors,
  seasonSchema,
  type ItemCategory,
  type ItemColor,
  type ItemResponse,
} from "@shared/item";

import { TextField } from "@/components/auth/text-field";
import { MultiChipGroup, SingleChipGroup } from "@/components/items/chip-group";
import { ItemSaved } from "@/components/items/item-saved";
import { PhotoInput } from "@/components/items/photo-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { seasonLabels } from "@/config/items";
import { ApiError } from "@/lib/api";
import { ImagePipelineError, processPhoto, type ProcessedPhoto } from "@/lib/imagePipeline";
import {
  defaultItemName,
  emptyItemForm,
  itemFormSchema,
  toItemUploadInput,
  type ItemFormInput,
  type ItemFormValues,
} from "@/lib/item-form";
import { uploadItem } from "@/lib/items-api";

const categoryOptions = itemCategories.map((category) => ({ value: category, label: category }));
const seasonOptions = seasonSchema.options.map((season) => ({
  value: season,
  label: seasonLabels[season],
}));

// Fields inside "Weitere Angaben"; the section opens when one of them is invalid.
const DETAIL_FIELDS = [
  "brand",
  "size",
  "price",
  "purchaseDate",
  "material",
  "retailer",
  "notes",
] as const;

const PHOTO_MISSING = "Bitte füge ein Foto hinzu.";
const UNKNOWN_ERROR = "Das Teil konnte nicht gespeichert werden. Bitte versuche es erneut.";

type Photo = ProcessedPhoto & { previewUrl: string };

export function ItemForm() {
  const form = useForm<ItemFormInput, unknown, ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: emptyItemForm,
  });
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Share of the upload done, or null while not uploading.
  const [progress, setProgress] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ItemResponse | null>(null);
  const photoTrigger = useRef<HTMLButtonElement>(null);

  // Frees the preview's memory when it is replaced or the page is left.
  const previewUrl = photo?.previewUrl ?? null;
  useEffect(() => {
    return () => {
      if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const color = form.watch("color");
  const category = form.watch("category");
  const suggestedColor = photo?.suggestedColor ?? null;
  const colorOptions = itemColors.map((value) => ({
    value,
    label: value,
    ...(value === suggestedColor && { tag: "Vorschlag" }),
  }));
  const defaultName = defaultItemName(color, category);

  async function selectPhoto(file: File) {
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const processed = await processPhoto(file);
      // Replace the color only while the user has not picked one themselves.
      const current = form.getValues("color");
      if (processed.suggestedColor !== null && (current === "" || current === suggestedColor)) {
        form.setValue("color", processed.suggestedColor);
      }
      setPhoto({ ...processed, previewUrl: URL.createObjectURL(processed.photo) });
    } catch (error) {
      setPhotoError(
        error instanceof ImagePipelineError
          ? error.message
          : "Das Foto konnte nicht verarbeitet werden. Bitte versuche es erneut.",
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save(values: ItemFormValues) {
    if (photo === null) return;
    setSubmitError(null);
    setProgress(0);
    try {
      const item = await uploadItem(
        { photo: photo.photo, thumbnail: photo.thumbnail, fields: toItemUploadInput(values) },
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

  function showInvalid(errors: FieldErrors<ItemFormInput>) {
    if (DETAIL_FIELDS.some((field) => errors[field] !== undefined)) setDetailsOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (photo === null) setPhotoError(PHOTO_MISSING);
    return form.handleSubmit(save, showInvalid)(event);
  }

  function startNext() {
    form.reset(emptyItemForm);
    setPhoto(null);
    setPhotoError(null);
    setSubmitError(null);
    setDetailsOpen(false);
    setSaved(null);
    window.scrollTo({ top: 0 });
    // Wait for the form to render again before moving focus into it.
    requestAnimationFrame(() => photoTrigger.current?.focus());
  }

  if (saved !== null) return <ItemSaved item={saved} onNext={startNext} />;

  const uploading = progress !== null;
  const busy = uploading || photoBusy;
  const percent = Math.round((progress ?? 0) * 100);

  return (
    <Form {...form}>
      <form className="item-form" onSubmit={handleSubmit} noValidate aria-busy={uploading}>
        <PhotoInput
          previewUrl={previewUrl}
          busy={photoBusy}
          error={photoError}
          onSelect={selectPhoto}
          triggerRef={photoTrigger}
        />

        <Controller
          control={form.control}
          name="category"
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

        <Controller
          control={form.control}
          name="color"
          render={({ field }) => (
            <SingleChipGroup<ItemColor>
              legend="Farbe"
              options={colorOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <TextField
          control={form.control}
          name="name"
          label="Name"
          {...(defaultName && { hint: `Leer lassen für „${defaultName}“.` })}
          placeholder={defaultName || "z. B. Leinenhemd"}
          maxLength={120}
          autoComplete="off"
        />

        <details
          className="form-details"
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        >
          <summary className="form-details-summary">Weitere Angaben (optional)</summary>
          <div className="form-details-fields">
            <TextField
              control={form.control}
              name="brand"
              label="Marke"
              maxLength={80}
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="size"
              label="Größe"
              maxLength={40}
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="price"
              label="Preis in €"
              inputMode="decimal"
              placeholder="z. B. 49,90"
              autoComplete="off"
            />
            <TextField control={form.control} name="purchaseDate" label="Kaufdatum" type="date" />
            <TextField
              control={form.control}
              name="material"
              label="Material"
              maxLength={120}
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="retailer"
              label="Händler"
              maxLength={120}
              autoComplete="off"
            />
            <Controller
              control={form.control}
              name="seasons"
              render={({ field }) => (
                <MultiChipGroup
                  legend="Saison"
                  options={seasonOptions}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notiz</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" maxLength={5000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </details>

        <div className="item-form-actions">
          {uploading && (
            <div className="upload-progress">
              <Progress value={percent} aria-label="Upload-Fortschritt" />
              <p className="upload-progress-text" aria-hidden="true">
                Wird hochgeladen … {percent} %
              </p>
            </div>
          )}
          <p className="sr-only" role="status">
            {uploading ? "Dein Teil wird hochgeladen." : ""}
          </p>
          {submitError !== null && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}
          <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
            {uploading ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
