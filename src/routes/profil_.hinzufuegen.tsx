import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { ItemForm } from "@/components/items/item-form";
import { PrivacyBadge } from "@/components/items/privacy-badge";
import { ReceiptTab } from "@/components/receipts/receipt-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pageHead } from "@/config/site";
import { authClient } from "@/lib/auth-client";

type AddTab = "foto" | "beleg";

export const Route = createFileRoute("/profil_/hinzufuegen")({
  validateSearch: (search: Record<string, unknown>): { tab?: AddTab } =>
    search["tab"] === "beleg" ? { tab: "beleg" } : {},
  head: () =>
    pageHead("Hinzufügen", "Füge deinem Schrank Teile per Foto oder über einen Beleg hinzu."),
  // Private page: without a session the visitor is sent to the login.
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/login" });
  },
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
        <TabsList className="add-tabs-list">
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
