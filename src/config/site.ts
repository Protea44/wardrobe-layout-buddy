export const siteConfig = {
  name: "Kleiderschrank Kompakt",
  tagline: "Dein Kleiderschrank – belegt, sortiert, griffbereit.",
};

export const primaryNavigation = [
  { label: "Kleidung kaufen", to: "/kaufen" },
  { label: "Mein Profil", to: "/profil" },
] as const;

export const legalNavigation = [
  { label: "Impressum", to: "/impressum" },
  { label: "Datenschutz", to: "/datenschutz" },
  { label: "AGB", to: "/agb" },
] as const;

export function pageHead(name: string, description: string) {
  const title = `${name} – ${siteConfig.name}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}