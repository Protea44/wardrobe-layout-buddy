import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import type { ItemResponse } from "@shared/item";

import { PrivacyBadge } from "@/components/items/privacy-badge";
import { seasonLabels } from "@/config/items";
import { pageHead } from "@/config/site";
import { ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { formatDate, formatPrice } from "@/lib/format";
import { fetchItem, itemPhotoUrl, itemQueryKeys } from "@/lib/items-api";

export const Route = createFileRoute("/profil_/schrank/$id")({
  head: () => pageHead("Teil", "Ein Teil aus deinem privaten Kleiderschrank."),
  // Private page: without a session the visitor is sent to the login.
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/login" });
  },
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
  ];
  return rows.filter((row): row is [string, string] => row[1] !== null);
}

function ItemPage() {
  const { id } = Route.useParams();
  const item = useQuery({ queryKey: itemQueryKeys.detail(id), queryFn: () => fetchItem(id) });
  const notFound = item.error instanceof ApiError && item.error.status === 404;

  return (
    <div className="site-container page-body item-page">
      <Link to="/profil/schrank" className="back-link">
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
      {item.data && (
        <article className="item-detail">
          {item.data.photoKey !== null && (
            <div className="item-detail-photo">
              <img src={itemPhotoUrl(item.data.photoKey)} alt={`Foto: ${item.data.name}`} />
            </div>
          )}
          <div>
            {item.data.brand !== null && <p className="item-card-brand">{item.data.brand}</p>}
            <h1 className="page-title">{item.data.name}</h1>
            {item.data.visibility === "PRIVATE" && <PrivacyBadge />}
            <dl className="profile-details">
              {details(item.data).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </article>
      )}
    </div>
  );
}
