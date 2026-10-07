import { Controller, type UseFormReturn } from "react-hook-form";

import {
  itemCategories,
  itemColors,
  seasonSchema,
  type ItemCategory,
  type ItemColor,
} from "@shared/item";

import { TextField } from "@/components/auth/text-field";
import { MultiChipGroup, SingleChipGroup } from "@/components/items/chip-group";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { seasonLabels } from "@/config/items";
import { defaultItemName, type ItemFormInput, type ItemFormValues } from "@/lib/item-form";

const categoryOptions = itemCategories.map((category) => ({ value: category, label: category }));
const seasonOptions = seasonSchema.options.map((season) => ({
  value: season,
  label: seasonLabels[season],
}));

type ItemFieldsProps = {
  form: UseFormReturn<ItemFormInput, unknown, ItemFormValues>;
  suggestedColor: ItemColor | null;
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
};

// Category and color chips, name and the optional details: shared by the add
// and the edit form.
export function ItemFields({
  form,
  suggestedColor,
  detailsOpen,
  onDetailsOpenChange,
}: ItemFieldsProps) {
  const color = form.watch("color");
  const category = form.watch("category");
  const defaultName = defaultItemName(color, category);
  const colorOptions = itemColors.map((value) => ({
    value,
    label: value,
    ...(value === suggestedColor && { tag: "Vorschlag" }),
  }));

  return (
    <>
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
        onToggle={(event) => onDetailsOpenChange(event.currentTarget.open)}
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
    </>
  );
}
