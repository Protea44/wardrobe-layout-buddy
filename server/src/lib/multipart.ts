import type { FastifyRequest } from "fastify";

export type MultipartBody = {
  files: Map<string, Buffer>;
  fields: Map<string, string>;
  // A repeated name or a field cut off at the size limit.
  invalid: boolean;
};

// Reads every part, so the request body is always consumed before answering.
// Needs @fastify/multipart; files above its size limit throw a 413 here.
export async function readMultipart(request: FastifyRequest): Promise<MultipartBody> {
  const body: MultipartBody = { files: new Map(), fields: new Map(), invalid: false };

  for await (const part of request.parts()) {
    const seen = body.files.has(part.fieldname) || body.fields.has(part.fieldname);
    if (part.type === "file") {
      const content = await part.toBuffer();
      if (seen) body.invalid = true;
      else body.files.set(part.fieldname, content);
    } else if (seen || part.valueTruncated || typeof part.value !== "string") {
      body.invalid = true;
    } else {
      body.fields.set(part.fieldname, part.value);
    }
  }
  return body;
}

// The JSON in a multipart field, or undefined if it is not valid JSON.
export function parseJsonField(value: string | undefined): unknown {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}
