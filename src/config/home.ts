import { Archive, Camera, Lock, type LucideIcon } from "lucide-react";

export type Benefit = {
  icon: LucideIcon;
  title: string;
  text: string;
};

export const benefits: Benefit[] = [
  {
    icon: Camera,
    title: "Schnell erfasst",
    text: "Ein Foto oder eine Bestellbestätigung genügt. Du bestätigst nur noch, statt alles abzutippen.",
  },
  {
    icon: Archive,
    title: "Alles an einem Ort",
    text: "Marke, Größe, Preis, Kaufdatum und Beleg – dauerhaft gespeichert, auch wenn der Shop-Link verschwindet.",
  },
  {
    icon: Lock,
    title: "Privat ab Werk",
    text: "Jedes Teil ist privat, bis du es selbst freigibst. Export und Löschung jederzeit mit einem Klick.",
  },
];

export type Step = {
  title: string;
  text: string;
};

export const steps: Step[] = [
  {
    title: "Konto anlegen",
    text: "Mit E-Mail oder Google, in unter einer Minute.",
  },
  {
    title: "Teile erfassen",
    text: "Foto machen oder Kaufbeleg hochladen.",
  },
  {
    title: "Finden und kombinieren",
    text: "Filtern, suchen und Outfits zusammenstellen.",
  },
];
