import { Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

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

type ConfirmDeleteDialogProps = {
  title: string;
  description: ReactNode;
  // Shown when onConfirm fails with something other than an ApiError.
  errorMessage: string;
  onConfirm: () => Promise<void>;
  onDeleted: () => void;
};

// A "Löschen" button that asks first and stays open until the deletion worked.
export function ConfirmDeleteDialog({
  title,
  description,
  errorMessage,
  onConfirm,
  onDeleted,
}: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    setDeleting(true);
    try {
      await onConfirm();
      setOpen(false);
      onDeleted();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : errorMessage);
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
          <AlertDialogTitle className="dialog-title">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
