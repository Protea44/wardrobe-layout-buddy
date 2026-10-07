import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { primaryNavigation } from "@/config/site";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant="mobileTrigger"
          size="icon"
          className="h-11 w-11"
          aria-label="Menü öffnen"
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          <Menu aria-hidden="true" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="menu-overlay" />
        <Dialog.Content
          id="mobile-navigation"
          className="mobile-panel"
          aria-describedby={undefined}
        >
          <div className="mobile-panel-top">
            <Dialog.Title className="mobile-panel-title">Navigation</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="menu" size="icon" className="h-11 w-11" aria-label="Menü schließen">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <nav className="mobile-nav" aria-label="Hauptnavigation">
            {primaryNavigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="nav-link"
                activeOptions={{ exact: true }}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
