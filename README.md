# Kleiderschrank Kompakt Base

Build the base layout and routing. No backend yet.

1. Design tokens: set up the three brand colors and the off-white surface as Tailwind theme colors / CSS variables. Install @fontsource/cormorant-garamond (weights 500, 600) and @fontsource/inter (400, 500, 600) and use them as heading and body fonts.

2. Header (sticky, white background, 1px gold bottom border):
   - Top left: a reusable <Logo /> placeholder component. A box of 160×44px (120×36px on mobile) with a 1px dashed gold border and the text "Logo" in navy. It links to "/" with aria-label "Kleiderschrank Kompakt – Startseite". It must be easy to replace later with an SVG/PNG.
   - Right: navigation links "Kleidung kaufen" (/kaufen) and "Mein Profil" (/profil). Active link gets a thin gold underline.
   - Below 768px: replace the links with a burger button (aria-label "Menü öffnen", aria-expanded, aria-controls). It opens a full-height slide-in panel with navy background and white links, closes on Escape, on link click and via a close button, and traps focus while open.
   - Add a visually hidden "Zum Inhalt springen" skip link as the first focusable element.

3. Footer (navy background, white text, thin gold divider at the top):
   - Column 1: "Kleiderschrank Kompakt" in Cormorant Garamond plus one line: "Dein Kleiderschrank – belegt, sortiert, griffbereit."
   - Column 2 "Navigation": Kleidung kaufen, Mein Profil.
   - Column 3 "Rechtliches": Impressum (/impressum), Datenschutz (/datenschutz), AGB (/agb), and a button styled as a link "Cookie-Einstellungen" (no function yet).
   - Bottom row: "© {current year} Kleiderschrank Kompakt".
   - Columns stack on mobile.

4. Routes with simple placeholder pages (only an h1): /, /kaufen, /login, /profil, /impressum, /datenschutz, /agb, plus a styled 404 page "Seite nicht gefunden" with a link to the homepage.

5. Every page sets its own document title in the format "Seitenname – Kleiderschrank Kompakt" and its own meta description.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/48f8905a-e6a0-4019-9f5d-f61c4140d637).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
