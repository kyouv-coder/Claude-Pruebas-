// Web Crypto (not node:crypto) so this file works from both the Node
// server actions and the Edge middleware runtime without changes.

export const SESSION_COOKIE = "spa_session";

async function getKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function createSessionToken(
  userId: string,
  secret: string,
  maxAgeSeconds: number
) {
  const exp = Date.now() + maxAgeSeconds * 1000;
  const payloadBytes = new TextEncoder().encode(JSON.stringify({ sub: userId, exp }));
  const payload = toBase64Url(payloadBytes);
  const key = await getKey(secret);
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sig = toBase64Url(new Uint8Array(sigBuf));
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<{ sub: string } | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const key = await getKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(sig),
    new TextEncoder().encode(payload)
  );
  if (!valid) return null;

  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    if (typeof data.exp !== "number" || Date.now() > data.exp) return null;
    if (typeof data.sub !== "string") return null;
    return { sub: data.sub };
  } catch {
    return null;
  }
}
