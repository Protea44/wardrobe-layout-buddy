import { Prisma } from "../generated/prisma/client";

// A record the request points to (e.g. the receipt of an item) does not exist
// for this user. Routes answer it with 404, like any other foreign record.
export class RelatedRecordNotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "RelatedRecordNotFoundError";
  }
}

// A storage key that does not belong to the user's record. This is a bug in the
// calling code, never a user mistake: clients cannot choose keys.
export class InvalidStorageKeyError extends Error {
  constructor() {
    super("Storage key does not belong to this record");
    this.name = "InvalidStorageKeyError";
  }
}

// Prisma's "record to update/delete does not exist".
export function isRecordNotFound(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

// Prisma's "unique constraint failed", e.g. a client id that already exists.
export function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// Drops keys whose value is undefined, so "not sent" never overwrites a column.
export function defined<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

export function toDateOnly(value: Date | null) {
  return value === null ? null : value.toISOString().slice(0, 10);
}

export function fromDateOnly(value: string | null | undefined) {
  if (value === undefined || value === null) return value;
  return new Date(`${value}T00:00:00Z`);
}
