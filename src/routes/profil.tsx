import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/profil")({
  head: () => pageHead("Mein Profil", "Dein persönliches Profil bei Kleiderschrank Kompakt."),
  component: ProfilePage,
});

function ProfilePage() { return <PlaceholderPage title="Mein Profil" />; }