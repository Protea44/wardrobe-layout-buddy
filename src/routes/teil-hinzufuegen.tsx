import { createFileRoute, redirect } from "@tanstack/react-router";

// Old address of the photo form, which now lives on /profil/hinzufuegen.
export const Route = createFileRoute("/teil-hinzufuegen")({
  beforeLoad: () => {
    throw redirect({ to: "/profil/hinzufuegen", replace: true });
  },
});
