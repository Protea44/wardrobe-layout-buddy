import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ItemForm } from "@/components/items/item-form";
import { PrivacyBadge } from "@/components/items/privacy-badge";
import { ReceiptTab } from "@/components/receipts/receipt-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pageHead } from "@/config/site";
import { requireSession } from "@/lib/offline/session";

type AddTab = "foto" | "beleg";

export const Route = createFileRoute("/profil_/hinzufuegen")({
  validateSearch: (search: Record<string, unknown>): { tab?: AddTab } =>
    search["tab"] === "beleg" ? { tab: "beleg" } : {},
  head: ({ match }) =>
    match.search.tab === "beleg"
      ? pageHead(
          "Beleg hinzufügen",
          "Lade einen Kaufbeleg hoch und lege die Teile daraus in deinem Schrank an.",
        )
      : pageHead("Teil hinzufügen", "Fotografiere ein Kleidungsstück für deinen Schrank."),
  // Private page; offline it shows the offline copy.
  beforeLoad: requireSession,
  component: AddPage,
});

function AddPage() {
  const { tab = "foto" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <div className="site-container page-body item-page">
      <h1 className="page-title">Hinzufügen</h1>
      <PrivacyBadge />
      <Tabs
        value={tab}
        onValueChange={(value) =>
          void navigate({ search: value === "beleg" ? { tab: "beleg" } : {}, replace: true })
        }
        className="add-tabs"
      >
        <TabsList className="add-tabs-list h-auto">
          <TabsTrigger value="foto" className="add-tabs-trigger">
            Foto
          </TabsTrigger>
          <TabsTrigger value="beleg" className="add-tabs-trigger">
            Beleg
          </TabsTrigger>
        </TabsList>
        <TabsContent value="foto">
          <ItemForm />
        </TabsContent>
        <TabsContent value="beleg">
          <ReceiptTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
