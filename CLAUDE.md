# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Use npm locally, as the README documents.

```sh
npm i
npm run dev            # vite dev server
npm run build          # production build (nitro, Cloudflare target by default)
npm run build:dev      # build in development mode
npm run lint           # eslint (prettier runs as an eslint rule)
npm run format         # prettier --write .
npm test               # vitest run
npx vitest run src/test/app-routing.test.tsx   # single file
npx vitest run -t "matches a page for /"       # single test by name
npx tsc --noEmit       # type check (no script defined for it)
```

The committed lockfile is `bun.lock`, which Lovable maintains; npm does not read or update it, and the `package-lock.json` it generates is gitignored. `bunfig.toml` blocks package versions published less than 24 hours ago on the bun side. Ask the user before adding anything to `minimumReleaseAgeExcludes`.

## Architecture

Kleiderschrank Kompakt is a German-language site built with TanStack Start (React 19, SSR), Tailwind CSS v4 and shadcn/ui. It is frontend only so far: no backend, auth or data layer. All routes except `/` are placeholder pages. All user-facing copy is German.

### Build configuration

`vite.config.ts` uses `@lovable.dev/vite-tanstack-config`, which already bundles TanStack Start, the React plugin, Tailwind, tsconfig paths, nitro, the `@` alias and env injection. Adding any of those plugins manually breaks the app with duplicates; pass extra config through `defineConfig({ vite: { ... } })` instead.

`vitest.config.ts` is separate and does not use that wrapper, so it declares its own React plugin and `@` alias.

### Routing

File-based routes live in `src/routes` (conventions in `src/routes/README.md`). `src/routeTree.gen.ts` is generated; never edit it by hand. `src/router.tsx` creates the router with a `QueryClient` in route context.

`__root.tsx` owns the HTML shell (`lang="de"`), the skip link, Header, `<main>` Outlet, Footer, the 404 component and the error component. Each leaf route sets its `head` through `pageHead(name, description)` from `src/config/site.ts`, which yields the title format `Seitenname – Kleiderschrank Kompakt`.

### Server entry and error pipeline

Three files cooperate, and changes to one usually affect the others:

- `src/server.ts` is the custom SSR entry (wired in via `tanstackStart.server.entry`). It catches thrown errors and also rewrites the JSON 500 responses that h3 produces when it swallows a handler error, replacing them with the HTML from `src/lib/error-page.ts`.
- `src/lib/error-capture.ts` is imported for its side effects. It wraps `console.error` so `Error` arguments are expanded to message, stack, status and cause chain, and it remembers the last error for 5 seconds so `server.ts` can recover the original after h3 has discarded it.
- `src/start.ts` registers request middleware: an error middleware that logs and renders the error page (rethrowing anything with a `statusCode`), and the CSRF middleware for server functions. Defining `start.ts` opts out of the automatic CSRF middleware, so it must stay registered explicitly.

To log an error, call `console.error(error)` with the Error as its own argument; interpolating it into a string loses the stack. Client-side render errors go through `reportLovableError` in the root error component, which only has an effect inside the Lovable editor preview.

### Styling

`src/styles.css` is the single source for design tokens and component classes. Brand colors are `--navy` (#0B1F3A), `--gold` (#C9A24B) and `--surface` (#FAF8F3); the shadcn semantic tokens (`--primary`, `--border`, `--ring`, ...) are all derived from them, so change the brand variables rather than the derived ones. Headings use Cormorant Garamond, body text Inter, both self-hosted through `@fontsource`.

Layout and page sections use named classes in `@layer components` (`.site-container`, `.page-body`, `.nav-link`, `.home-hero`, ...) rather than long utility strings in JSX. Follow that pattern for new layout-level styling. `src/components/ui` holds stock shadcn components (`components.json`); add new ones with the shadcn CLI.

### TypeScript

`tsconfig.json` is strict beyond the defaults: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature` are on. Optional properties cannot be assigned `undefined` explicitly; spread them in conditionally, as `lovable-error-reporting.ts` does.

### Tests

Vitest with jsdom and Testing Library, files matching `src/**/*.{test,spec}.{ts,tsx}`, setup in `src/test/setup.ts`. The existing routing test matches routes with `router.matchRoutes` instead of rendering, because loaders may need a server and jsdom never loads the stylesheets React waits on. Prefer that approach for route-level tests.
