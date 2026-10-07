import { describe, expect, it } from "vitest";

import { isRecordKey, storageKey } from "./storage-keys";

describe("storage keys", () => {
  it("builds {userId}/{recordId}/{filename}", () => {
    expect(storageKey("user-1", "rec-1", "foto.jpg")).toBe("user-1/rec-1/foto.jpg");
  });

  it("reduces the file name to a safe last path segment", () => {
    expect(storageKey("u", "r", "../../etc/passwd")).toBe("u/r/passwd");
    expect(storageKey("u", "r", "C:\\Bilder\\Mein Foto (1).JPG")).toBe("u/r/Mein_Foto__1_.JPG");
    expect(storageKey("u", "r", "..hidden")).toBe("u/r/hidden");
    expect(() => storageKey("u", "r", "..")).toThrow();
  });

  it("recognises only files directly below the user's record", () => {
    expect(isRecordKey("u/r/foto.jpg", "u", "r")).toBe(true);
    expect(isRecordKey("u/other/foto.jpg", "u", "r")).toBe(false);
    expect(isRecordKey("u2/r/foto.jpg", "u", "r")).toBe(false);
    expect(isRecordKey("u/r/sub/foto.jpg", "u", "r")).toBe(false);
    expect(isRecordKey("u/r/..", "u", "r")).toBe(false);
    expect(isRecordKey("u/r/", "u", "r")).toBe(false);
    expect(isRecordKey("/r/foto.jpg", "", "r")).toBe(false);
  });
});
