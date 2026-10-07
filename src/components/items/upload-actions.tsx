import type { ReactNode } from "react";

import { Progress } from "@/components/ui/progress";

type UploadActionsProps = {
  // Share of the upload done, or null while not uploading.
  progress: number | null;
  error: string | null;
  // Announced to screen readers while uploading.
  status: string;
  children: ReactNode;
};

// The sticky bottom bar of an item form: progress, error and buttons.
export function UploadActions({ progress, error, status, children }: UploadActionsProps) {
  const percent = Math.round((progress ?? 0) * 100);

  return (
    <div className="item-form-actions">
      {progress !== null && (
        <div className="upload-progress">
          <Progress value={percent} aria-label="Upload-Fortschritt" />
          <p className="upload-progress-text" aria-hidden="true">
            Wird hochgeladen … {percent} %
          </p>
        </div>
      )}
      <p className="sr-only" role="status">
        {progress !== null ? status : ""}
      </p>
      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
