import { CirclePlus, Layers, Settings, Shirt } from "lucide-react";

// Entries of the profile area: label for the desktop sub-navigation, short label
// and icon for the mobile tab bar.
export const profileNavigation = [
  { to: "/profil/schrank", label: "Mein Schrank", shortLabel: "Schrank", icon: Shirt },
  {
    to: "/profil/hinzufuegen",
    label: "Teil hinzufügen",
    shortLabel: "Hinzufügen",
    icon: CirclePlus,
  },
  { to: "/profil/outfits", label: "Outfits", shortLabel: "Outfits", icon: Layers },
  {
    to: "/profil/einstellungen",
    label: "Einstellungen",
    shortLabel: "Einstellungen",
    icon: Settings,
  },
] as const;
