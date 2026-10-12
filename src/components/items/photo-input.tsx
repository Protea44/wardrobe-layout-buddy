import { Camera, ImagePlus, Images } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent, type DragEvent, type Ref } from "react";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

type PhotoInputProps = {
  previewUrl: string | null;
  busy: boolean;
  error: string | null;
  onSelect: (file: File) => void;
  // Receives the main button, so the form can move focus to it.
  triggerRef?: Ref<HTMLButtonElement>;
  // Optional photos are labelled as such.
  required?: boolean;
};

// Camera on phones, drag and drop or file picker on larger screens.
export function PhotoInput({
  previewUrl,
  busy,
  error,
  onSelect,
  triggerRef,
  required = true,
}: PhotoInputProps) {
  const isMobile = useIsMobile();
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allows picking the same file again after an error.
    event.target.value = "";
    if (file) onSelect(file);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) onSelect(file);
  }

  const hasPhoto = previewUrl !== null;
  const errorId = `${useId()}-error`;

  return (
    <fieldset className="photo-input" aria-describedby={error ? errorId : undefined}>
      <legend className="field-legend">
        Foto <span className="field-required">{required ? "(Pflichtfeld)" : "(optional)"}</span>
      </legend>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />

      <div
        className="photo-drop-zone"
        data-dragging={dragging || undefined}
        data-has-photo={hasPhoto || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {hasPhoto ? (
          <img className="photo-preview" src={previewUrl} alt="Vorschau deines Fotos" />
        ) : (
          <div className="photo-placeholder">
            <ImagePlus aria-hidden="true" />
            <p>{isMobile ? "Fotografiere dein Teil." : "Foto hierher ziehen oder auswählen."}</p>
          </div>
        )}
        {busy && (
          <p className="photo-busy" role="status">
            Foto wird vorbereitet …
          </p>
        )}
      </div>

      <div className="photo-actions">
        {isMobile ? (
          <>
            <Button
              ref={triggerRef}
              type="button"
              className="h-12 flex-1 text-base"
              disabled={busy}
              onClick={() => cameraInput.current?.click()}
            >
              <Camera aria-hidden="true" />
              {hasPhoto ? "Neu aufnehmen" : "Foto aufnehmen"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 text-base"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <Images aria-hidden="true" />
              Galerie
            </Button>
          </>
        ) : (
          <Button
            ref={triggerRef}
            type="button"
            variant={hasPhoto ? "outline" : "default"}
            className="h-11 px-6"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus aria-hidden="true" />
            {hasPhoto ? "Anderes Foto wählen" : "Datei auswählen"}
          </Button>
        )}
      </div>

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
