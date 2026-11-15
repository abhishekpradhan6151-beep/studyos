export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  // Host is the actual HTTP destination; Next's request URL can contain its bind address.
  // Never use user-supplied forwarded-host headers to authorize a request.
  const host = request.headers.get('host') || url.host;
  return !!origin && origin === `${url.protocol}//${host}` && request.headers.get('sec-fetch-site') !== 'cross-site';
}
export async function readLimitedJson(request: Request, maxBytes = 65536): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('Expected JSON');
  if (Number(request.headers.get('content-length')) > maxBytes) throw new Error('Request too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Empty request');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; length += value.byteLength; if (length > maxBytes) { await reader.cancel(); throw new Error('Request too large'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(data));
}
