import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type Frontend = {
  dir: string;
  shellHtml: string;
  // CSP sources ('sha256-...') for the inline scripts in the shell.
  inlineScriptHashes: string[];
};

// The SPA build emits its entry document as _shell.html; a plain Vite build would use index.html.
const SHELL_FILES = ["_shell.html", "index.html"];

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;

export function inlineScriptHashes(html: string): string[] {
  return [...html.matchAll(INLINE_SCRIPT)]
    .map((match) => match[1] ?? "")
    .filter((script) => script.trim() !== "")
    .map((script) => `'sha256-${createHash("sha256").update(script).digest("base64")}'`);
}

export function loadFrontend(dir: string): Frontend {
  const shellFile = SHELL_FILES.map((name) => path.join(dir, name)).find((file) =>
    existsSync(file),
  );
  if (shellFile === undefined) {
    throw new Error(`No built frontend found in ${dir}. Run "npm run build" first.`);
  }
  const shellHtml = readFileSync(shellFile, "utf8");
  return { dir, shellHtml, inlineScriptHashes: inlineScriptHashes(shellHtml) };
}