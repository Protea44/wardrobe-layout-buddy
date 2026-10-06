import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      ...pageHead("Seite nicht gefunden", "Diese Seite gibt es nicht. Kehre zur Startseite von Kleiderschrank Kompakt zurück.").meta,
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotFoundPage,
});

function NotFoundPage() {
  return (
    <div className="site-container page-body">
      <h1 className="page-title">Seite nicht gefunden</h1>
      <Button asChild className="not-found-link"><Link to="/">Zur Startseite</Link></Button>
    </div>
  );
}