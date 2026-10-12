export const LEGAL_DRAFT = true;

export const legalDraftNotice = "Entwurf – vor Veröffentlichung rechtlich prüfen lassen.";

export const legalProvider = {
  name: "Max Mustermann",
  street: "Musterstraße 1",
  zip: "12345",
  city: "Musterhausen",
  country: "Deutschland",
  email: "max@mustermann.de",
  phone: "00490123/4567890",
  vatId: "",
  legalForm: "Einzelunternehmen",
};

export const phoneHref = `tel:${legalProvider.phone.replace(/[^\d+]/g, "")}`;
export const emailHref = `mailto:${legalProvider.email}`;

export const storageEntries = [
  {
    name: "kk_consent",
    purpose: "Speichert deine Cookie-Auswahl",
    category: "Notwendig",
    duration: "12 Monate",
  },
  {
    name: "Offline-Speicher (IndexedDB)",
    purpose: "Nutzung deines Schranks ohne Internet",
    category: "Notwendig",
    duration: "bis zur Abmeldung",
  },
  {
    name: "Supabase-Sitzung",
    purpose: "Hält dich angemeldet",
    category: "Notwendig",
    duration: "Bis zur Abmeldung",
  },
] as const;
