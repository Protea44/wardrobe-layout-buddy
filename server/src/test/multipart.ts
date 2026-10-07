// Lets the Fetch API encode a FormData body and its boundary for app.inject.
export async function encodeMultipart(form: FormData) {
  const encoded = new Request("http://localhost/", { method: "POST", body: form });
  return {
    contentType: encoded.headers.get("content-type") ?? "",
    payload: Buffer.from(await encoded.arrayBuffer()),
  };
}

const ascii = (value: string) => [...value].map((char) => char.charCodeAt(0));

// Files that only have the right magic bytes; the routes never decode them.
export function fakeWebp(size = 64) {
  const bytes = new Uint8Array(size);
  bytes.set([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 ")]);
  return bytes;
}

export function fakePdf(size = 64) {
  const bytes = new Uint8Array(size);
  bytes.set(ascii("%PDF-1.7\n"));
  return bytes;
}

export const fakeJpeg = () => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, ...ascii("JFIF")]);
