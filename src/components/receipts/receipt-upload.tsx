import { FileUp } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { RECEIPT_FILE_MAX_BYTES, type ReceiptResponse } from "@shared/receipt";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RECEIPT_FILE_ACCEPT } from "@/config/receipts";
import { ApiError } from "@/lib/api";
import { ImagePipelineError, prepareReceiptFile } from "@/lib/imagePipeline";
import { uploadReceipt } from "@/lib/receipts-api";

const TOO_LARGE = "Der Beleg ist zu groß. Erlaubt sind höchstens 10 MB.";
const UNKNOWN_ERROR = "Der Beleg konnte nicht hochgeladen werden. Bitte versuche es erneut.";

type ReceiptUploadProps = {
  onUploaded: (receipt: ReceiptResponse) => void;
};

// Picks a PDF, JPG or PNG, strips photo metadata and uploads it with progress.
export function ReceiptUpload({ onUploaded }: ReceiptUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  // Share of the upload done, or null while not uploading.
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = preparing || progress !== null;
  const percent = Math.round((progress ?? 0) * 100);

  async function upload(file: File) {
    setError(null);
    setPreparing(true);
    try {
      const prepared = await prepareReceiptFile(file);
      if (prepared.size > RECEIPT_FILE_MAX_BYTES) throw new ImagePipelineError(TOO_LARGE);
      setPreparing(false);
      setProgress(0);
      onUploaded(await uploadReceipt(prepared, { onProgress: setProgress }));
    } catch (caught) {
      const known = caught instanceof ImagePipelineError || caught instanceof ApiError;
      setError(known ? caught.message : UNKNOWN_ERROR);
    } finally {
      setPreparing(false);
      setProgress(null);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void upload(file);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) void upload(file);
  }

  return (
    <div className="receipt-upload" aria-busy={busy}>
      <input
        ref={input}
        type="file"
        accept={RECEIPT_FILE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      <div
        className="photo-drop-zone receipt-drop-zone"
        data-dragging={dragging || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="photo-placeholder">
          <FileUp aria-hidden="true" />
          <p>PDF, JPG oder PNG, höchstens 10 MB.</p>
          <Button
            type="button"
            className="h-12 px-6 text-base"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            Beleg auswählen
          </Button>
        </div>
      </div>

      <p className="sr-only" role="status">
        {preparing ? "Beleg wird vorbereitet." : progress !== null ? "Beleg wird hochgeladen." : ""}
      </p>
      {preparing && <p className="upload-progress-text">Beleg wird vorbereitet …</p>}
      {progress !== null && (
        <div className="upload-progress">
          <Progress value={percent} aria-label="Upload-Fortschritt" />
          <p className="upload-progress-text" aria-hidden="true">
            Wird hochgeladen … {percent} %
          </p>
        </div>
      )}
      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
