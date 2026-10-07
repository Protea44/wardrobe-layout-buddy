import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import type { ItemResponse } from "@shared/item";

import { DeleteItemDialog } from "@/components/items/delete-item-dialog";
import { ItemEditForm } from "@/components/items/item-edit-form";
import { ItemReceipt } from "@/components/items/item-receipt";
import { ItemStatus } from "@/components/items/item-status";
import { StoredImage } from "@/components/stored-image";
import { Button } from "@/components/ui/button";
import { seasonLabels } from "@/config/items";
import { pageHead } from "@/config/site";
import { ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { itemQueryKeys } from "@/lib/items-api";
import { loadItem } from "@/lib/offline/data";
import { parseWardrobeSearch } from "@/lib/wardrobe-search";
import { requireSession } from "@/lib/offline/session";

export const Route = createFileRoute("/profil_/schrank/$id")({
  // The wardrobe's filters ride along, so "Zurück zum Schrank" restores them.
  validateSearch: parseWardrobeSearch,
  head: () => pageHead("Teil", "Ein Teil aus deinem privaten Kleiderschrank."),
  // Private page; offline it shows the offline copy.
  beforeLoad: requireSession,
  component: ItemPage,
});

function details(item: ItemResponse): [string, string][] {
  const rows: [string, string | null][] = [
    ["Kategorie", item.category],
    ["Farbe", item.color],
    ["Marke", item.brand],
    ["Größe", item.size],
    ["Preis", item.price === null ? null : formatPrice(item.price)],
    ["Kaufdatum", item.purchaseDate === null ? null : formatDate(item.purchaseDate)],
    ["Material", item.material],
    ["Händler", item.retailer],
    [
      "Saison",
      item.seasons.length === 0
        ? null
        : item.seasons.map((season) => seasonLabels[season]).join(", "),
    ],
    ["Notiz", item.notes],
    ["Hinzugefügt am", formatDate(item.createdAt)],
  ];
  return rows.filter((row): row is [string, string] => row[1] !== null);
}

function ItemPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const item = useQuery({ queryKey: itemQueryKeys.detail(id), queryFn: () => loadItem(id) });
  const [editing, setEditing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const notFound = item.error instanceof ApiError && item.error.status === 404;

  function leaveEditing() {
    setEditing(false);
    requestAnimationFrame(() => heading.current?.focus());
  }

  function handleSaved(updated: ItemResponse) {
    queryClient.setQueryData(itemQueryKeys.detail(id), updated);
    void queryClient.invalidateQueries({ queryKey: itemQueryKeys.all });
    toast.success("Gespeichert");
    leaveEditing();
  }

  function handleDeleted() {
    queryClient.removeQueries({ queryKey: itemQueryKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: itemQueryKeys.all });
    toast.success("Gelöscht");
    void navigate({ to: "/profil/schrank", search });
  }

  return (
    <div className="site-container page-body item-detail-page">
      <Link to="/profil/schrank" search={search} className="back-link">
        <ArrowLeft aria-hidden="true" />
        Zurück zum Schrank
      </Link>

      {item.isPending && <p className="receipt-muted">Wird geladen …</p>}
      {item.isError && (
        <>
          <h1 className="page-title">{notFound ? "Teil nicht gefunden" : "Fehler"}</h1>
          <p className="form-error item-detail-error" role="alert">
            {notFound
              ? "Dieses Teil gibt es in deinem Schrank nicht."
              : item.error instanceof ApiError
                ? item.error.message
                : "Das Teil konnte nicht geladen werden."}
          </p>
        </>
      )}

      {item.data && editing && (
        <div className="item-edit">
          <h1 ref={heading} tabIndex={-1} className="page-title">
            Teil bearbeiten
          </h1>
          <ItemEditForm item={item.data} onSaved={handleSaved} onCancel={leaveEditing} />
        </div>
      )}

      {item.data && !editing && (
        <article className="item-detail">
          <div className="item-detail-photo">
            {item.data.photoKey !== null ? (
              <StoredImage
                storageKey={item.data.photoKey}
                fallbackKey={item.data.thumbnailKey}
                alt={`Foto: ${item.data.name}`}
              />
            ) : (
              <p className="receipt-muted">Kein Foto</p>
            )}
          </div>
          <div className="item-detail-body">
            {item.data.brand !== null && <p className="item-card-brand">{item.data.brand}</p>}
            <h1 ref={heading} tabIndex={-1} className="page-title item-detail-title">
              {item.data.name}
            </h1>
            <ItemStatus />
            <div className="item-detail-actions">
              <Button type="button" className="h-11 px-5" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" />
                Bearbeiten
              </Button>
              <DeleteItemDialog
                itemId={item.data.id}
                itemName={item.data.name}
                onDeleted={handleDeleted}
              />
            </div>
            <dl className="profile-details item-detail-list">
              {details(item.data).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {item.data.receiptId !== null && <ItemReceipt receiptId={item.data.receiptId} />}
          </div>
        </article>
      )}
    </div>
  );
}
