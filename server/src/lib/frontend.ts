import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type Frontend = {
  dir: string;
  // index.html, sent for every client-side route.
  shellHtml: string;
};

export function loadFrontend(dir: string): Frontend {
  const shellFile = path.join(dir, "index.html");
  if (!existsSync(shellFile)) {
    throw new Error(`No built frontend found in ${dir}. Run "npm run build" first.`);
  }
  return { dir, shellHtml: readFileSync(shellFile, "utf8") };
}
