# Kleiderschrank Kompakt

German-language, fully responsive web app: a private digital wardrobe and purchase archive.

## Tech stack
- Frontend (repo root, originally generated with Lovable): React, TypeScript, Vite, Tailwind, shadcn/ui.
- Backend (/server): Node.js 20+, TypeScript, Fastify, Prisma, PostgreSQL, Better Auth, S3-compatible object storage (MinIO locally).
- Shared zod schemas and types in /shared.
- Local services via docker-compose.yml: postgres, minio, mailpit.
- Dev: Vite proxies /api to the backend. Production: the backend serves the built frontend and /api from the same origin.
- Do NOT use Supabase, Firebase, Lovable Cloud or any other hosted backend service.

## Commands
(to be filled in during the backend setup task)

## Language
- All user-facing text is German (de-DE), informal "du". Code, comments and identifiers in English.
- Dates as DD.MM.YYYY, prices as "1.234,56 €". <html lang="de">.

## Design (style: elegant, calm, premium)
- Colors only: Navy #0B1F3A (primary, text on light backgrounds, dark sections), Gold #C9A24B (accents, thin lines, icons, primary buttons on navy), White #FFFFFF (main background). Tints allowed for borders and surfaces (e.g. navy at 8% opacity, off-white #FAF8F3).
- Never gold for body text or small text on white. Gold text only on navy. On white, primary buttons are navy with white text; on navy, gold with navy text.
- Cormorant Garamond for headings, Inter for body/UI, self-hosted via @fontsource. Never Google Fonts or any CDN.
- Generous whitespace, thin 1px gold dividers, subtle shadows, radius max 8px, no gradients, no emojis, no stock photos. Icons: lucide-react only.
- Mobile-first, responsive from 360px to 1440px+.

## Legal, privacy, security (Germany)
- No external resources: no CDNs, no external fonts, images, embeds or scripts.
- HTTPS only in production; never reference http:// resources.
- No non-essential cookies or storage before explicit consent via the cookie banner.
- Every page shows footer links to Impressum, Datenschutz, AGB and Cookie-Einstellungen.
- Privacy by default: all user content is private unless the user explicitly changes it.
- Uploaded photos are re-encoded client-side so EXIF/GPS metadata is removed.
- All user data is stored in the EU.
- Every API route that touches user data requires a session and scopes every query by the session user id. Records of other users return 404.
- Files are only delivered through the authenticated /api/files route.
- Never log personal data, request bodies, cookies, email contents or receipt contents.

## Accessibility
- WCAG 2.1 AA: text contrast ≥ 4.5:1, visible focus (2px gold outline), full keyboard operation, semantic HTML, one h1 per page, aria-labels on icon-only buttons, alt text on all images, no duplicated text in links or buttons.

## Working style
- Only change what the current task asks for. No unrelated refactors or redesigns.
- Keep components small and reusable. Shared frontend config in src/config.
- Every new API route gets zod validation, an auth check, ownership scoping and integration tests, including one proving that another user gets 404.
- After each task: run typecheck, lint and tests and fix failures. Then give a short summary of the changes, how to test them manually, and a suggested commit message. Do not commit yourself.
