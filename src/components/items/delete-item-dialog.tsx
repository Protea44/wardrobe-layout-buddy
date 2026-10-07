import { Trash2 } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { deleteItem } from "@/lib/items-api";

type DeleteItemDialogProps = {
  itemId: string;
  itemName: string;
  onDeleted: () => void;
};

export function DeleteItemDialog({ itemId, itemName, onDeleted }: DeleteItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    setDeleting(true);
    try {
      await deleteItem(itemId);
      setOpen(false);
      onDeleted();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Das Teil konnte nicht gelöscht werden. Bitte versuche es erneut.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!deleting) setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 px-5">
          <Trash2 aria-hidden="true" />
          Löschen
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="dialog-title">Teil löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            „{itemName}“ wird mit Foto dauerhaft aus deinem Schrank und aus allen Outfits entfernt.
            Das lässt sich nicht rückgängig machen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error !== null && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={deleting}>
            Abbrechen
          </AlertDialogCancel>
          {/* A plain button, so the dialog stays open until the deletion succeeded. */}
          <Button type="button" className="h-11" disabled={deleting} onClick={() => void confirm()}>
            {deleting ? "Wird gelöscht …" : "Endgültig löschen"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
