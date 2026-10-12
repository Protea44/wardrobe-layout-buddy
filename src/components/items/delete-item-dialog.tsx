import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { deleteItem } from "@/lib/items-api";

type DeleteItemDialogProps = {
  itemId: string;
  itemName: string;
  onDeleted: () => void;
};

export function DeleteItemDialog({ itemId, itemName, onDeleted }: DeleteItemDialogProps) {
  return (
    <ConfirmDeleteDialog
      title="Teil löschen?"
      description={
        <>
          „{itemName}“ wird mit Foto dauerhaft aus deinem Schrank und aus allen Outfits entfernt.
          Das lässt sich nicht rückgängig machen.
        </>
      }
      errorMessage="Das Teil konnte nicht gelöscht werden. Bitte versuche es erneut."
      onConfirm={() => deleteItem(itemId)}
      onDeleted={onDeleted}
    />
  );
}
