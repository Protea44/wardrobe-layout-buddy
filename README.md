# Kleiderschrank Kompakt

Deutschsprachige Web-App: ein privater digitaler Kleiderschrank mit Kaufarchiv.

Das Frontend ist eine React-Single-Page-App (Vite, TanStack Router, Tailwind CSS, shadcn/ui), das Backend unter `server/` läuft mit Fastify, Prisma und PostgreSQL. Projektregeln und Architektur stehen in `CLAUDE.md`.

## Entwicklung

Voraussetzung: Node.js 20.12 oder neuer, npm und Docker.

```sh
cp .env.example .env     # danach jedes "change-me" ersetzen
npm install
docker compose up -d     # PostgreSQL, Objektspeicher, Mailpit
npm run db:migrate
npm run dev              # Frontend auf :5173, Backend auf :3000
```

Weitere Befehle:

```sh
npm run typecheck
npm run lint
npm test                 # braucht die laufenden Docker-Dienste
npm run build            # Frontend nach dist/, Backend nach server/dist/
npm run start            # gebautes Backend starten; mit NODE_ENV=production liefert es auch dist/ aus
```
