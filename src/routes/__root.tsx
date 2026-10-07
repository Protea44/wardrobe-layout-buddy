import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  type ErrorComponentProps,
} from "@tanstack/react-router";

import { ConsentManager } from "@/components/consent/consent-manager";
import { Header } from "@/components/layout/header";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { OfflineSync } from "@/components/offline/offline-sync";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="site-container page-body">
      <h1 className="page-title">Seite nicht gefunden</h1>
      <Button asChild className="not-found-link h-11 px-6">
        <Link to="/">Zur Startseite</Link>
      </Button>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Diese Seite konnte nicht geladen werden
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Etwas ist schiefgelaufen. Versuch es erneut oder gehe zur Startseite.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Erneut versuchen
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Zur Startseite</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* React hoists the current route's title and meta tags into <head>. */}
      <HeadContent />
      <div className="site-shell">
        <a className="skip-link" href="#main-content">
          Zum Inhalt springen
        </a>
        <Header />
        <OfflineBanner />
        <main id="main-content" className="site-main" tabIndex={-1}>
          <Outlet />
        </main>
        <Footer />
        <ConsentManager />
        <Toaster position="top-center" />
        <OfflineSync />
      </div>
    </QueryClientProvider>
  );
}
