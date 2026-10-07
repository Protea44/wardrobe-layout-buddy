import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { OUTFIT_ITEMS_MAX, type OutfitResponse } from "@shared/outfit";

import { TextField } from "@/components/auth/text-field";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ItemPicker } from "@/components/outfits/item-picker";
import { OutfitCanvas } from "@/components/outfits/outfit-canvas";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ApiError } from "@/lib/api";
import { addItem, fromOutfit, type CanvasItem, type PickedItem } from "@/lib/outfit-canvas";
import { outfitFormSchema, toOutfitSaveInput, type OutfitFormValues } from "@/lib/outfit-form";
import { newClientId, storeOutfit } from "@/lib/offline/mutations";
import { useOnline } from "@/lib/offline/online";
import { deleteOutfit, outfitQueryKeys } from "@/lib/outfits-api";

const UNKNOWN_ERROR = "Das Outfit konnte nicht gespeichert werden. Bitte versuche es erneut.";

// Creates a new outfit (outfit null) or edits an existing one.
export function OutfitEditor({ outfit }: { outfit: OutfitResponse | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<OutfitFormValues>({
    resolver: zodResolver(outfitFormSchema),
    defaultValues: { name: outfit?.name ?? "", occasion: outfit?.occasion ?? "" },
  });
  // A new outfit gets its id now, so saving twice (or a retried sync) never
  // creates two outfits.
  const [outfitId] = useState(() => outfit?.id ?? newClientId());
  const [items, setItems] = useState<CanvasItem[]>(() => (outfit ? fromOutfit(outfit) : []));
  const online = useOnline();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickedIds = new Set(items.map(({ itemId }) => itemId));
  const full = items.length >= OUTFIT_ITEMS_MAX;

  function pick(item: PickedItem) {
    if (full) {
      toast.error(`Ein Outfit kann höchstens ${OUTFIT_ITEMS_MAX} Teile enthalten.`);
      return;
    }
    setItems((current) => addItem(current, item));
    setSelectedId(item.itemId);
  }

  function leave() {
    void navigate({ to: "/profil/outfits" });
  }

  async function save(values: OutfitFormValues) {
    setError(null);
    try {
      const saved = await storeOutfit(outfitId, outfit, toOutfitSaveInput(values, items), items);
      queryClient.setQueryData(outfitQueryKeys.detail(saved.id), saved);
      await queryClient.invalidateQueries({ queryKey: outfitQueryKeys.all });
      toast.success("Gespeichert");
      leave();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : UNKNOWN_ERROR);
    }
  }

  const picker = <ItemPicker pickedIds={pickedIds} onPick={pick} />;
  const saving = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form className="outfit-editor" onSubmit={form.handleSubmit(save)} noValidate>
        <div className="outfit-editor-main">
          <div className="outfit-fields">
            <TextField
              control={form.control}
              name="name"
              label="Name (Pflichtfeld)"
              placeholder="z. B. Büro im Herbst"
              maxLength={120}
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="occasion"
              label="Anlass (optional)"
              placeholder="z. B. Hochzeit, Meeting"
              maxLength={120}
              autoComplete="off"
            />
          </div>

          <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
            <SheetTrigger asChild>
              <Button type="button" className="outfit-picker-button h-12 text-base">
                <Plus aria-hidden="true" />
                Teile hinzufügen
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="wardrobe-sheet outfit-picker-sheet">
              <SheetHeader>
                <SheetTitle className="wardrobe-sheet-title">Teile hinzufügen</SheetTitle>
                <SheetDescription>Tippe auf ein Teil, um es ins Outfit zu legen.</SheetDescription>
              </SheetHeader>
              {picker}
              <Button
                type="button"
                className="h-12 w-full text-base"
                onClick={() => setPickerOpen(false)}
              >
                Fertig
              </Button>
            </SheetContent>
          </Sheet>

          <OutfitCanvas
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={setItems}
          />
        </div>

        <aside className="outfit-picker-panel" aria-label="Teile hinzufügen">
          <h2 className="outfit-picker-title">Teile hinzufügen</h2>
          {picker}
        </aside>

        <div className="item-form-actions outfit-editor-actions">
          {error !== null && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="receipt-form-buttons">
            <Button
              type="button"
              variant="outline"
              className="h-12 text-base"
              disabled={saving}
              onClick={leave}
            >
              Abbrechen
            </Button>
            {outfit !== null && (
              <ConfirmDeleteDialog
                title="Outfit löschen?"
                description={
                  <>„{outfit.name}“ wird dauerhaft gelöscht. Die Teile bleiben in deinem Schrank.</>
                }
                errorMessage="Das Outfit konnte nicht gelöscht werden. Bitte versuche es erneut."
                onConfirm={() => deleteOutfit(outfit.id)}
                onDeleted={() => {
                  queryClient.removeQueries({ queryKey: outfitQueryKeys.detail(outfit.id) });
                  void queryClient.invalidateQueries({ queryKey: outfitQueryKeys.all });
                  toast.success("Gelöscht");
                  leave();
                }}
              />
            )}
            <Button type="submit" className="h-12 flex-1 text-base" disabled={saving}>
              {saving ? "Wird gespeichert …" : "Speichern"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
