import { buildApp, type BuildAppOptions } from "../app";
import { loadConfig } from "../config";
import type { Storage } from "../lib/storage";

// Storage that fails loudly: tests that reach storage must pass their own.
const unusedStorage: Storage = {
  putObject: () => Promise.reject(new Error("storage not available in this test")),
  getObjectStream: () => Promise.reject(new Error("storage not available in this test")),
  deleteObject: () => Promise.reject(new Error("storage not available in this test")),
  deletePrefix: () => Promise.reject(new Error("storage not available in this test")),
};

export function buildTestApp(overrides: Partial<Omit<BuildAppOptions, "config">> = {}) {
  return buildApp({ config: loadConfig(), storage: unusedStorage, ...overrides });
}
