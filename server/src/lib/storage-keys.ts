import { randomUUID } from "node:crypto";

// Ids are created before the row when a file has to be stored first: the
// object key contains the id of the record the file belongs to.
export function newRecordId() {
  return randomUUID();
}

// Keeps letters, digits, dot, dash and underscore of the last path segment.
function safeFilename(filename: string) {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(-100);
  if (cleaned === "") throw new Error("Storage key needs a file name");
  return cleaned;
}

// Object key layout in the private buckets: {userId}/{recordId}/{filename}
export function storageKey(userId: string, recordId: string, filename: string) {
  return `${userId}/${recordId}/${safeFilename(filename)}`;
}

// True if the key is a file directly below this user's record.
export function isRecordKey(key: string, userId: string, recordId: string) {
  const prefix = `${userId}/${recordId}/`;
  if (userId === "" || recordId === "" || !key.startsWith(prefix)) return false;
  const filename = key.slice(prefix.length);
  return filename !== "" && !filename.includes("/") && filename !== "." && filename !== "..";
}
