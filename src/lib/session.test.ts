import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

// Lógica pura (Web Crypto, sin DB) pero es la pieza de seguridad más
// sensible de toda la app: si esto falla mal, o bien nadie puede loguearse,
// o peor, una sesión inválida/expirada/alterada queda aceptada.
describe("createSessionToken / verifySessionToken", () => {
  const secret = "test-secret-do-not-use-in-prod";

  it("round-trips a valid token back to the same userId and sessionVersion", async () => {
    const token = await createSessionToken("user-123", secret, 3600, 2);
    const session = await verifySessionToken(token, secret);
    expect(session).toEqual({ sub: "user-123", sessionVersion: 2 });
  });

  it("rejects a token verified with the wrong secret", async () => {
    const token = await createSessionToken("user-123", secret, 3600, 0);
    const session = await verifySessionToken(token, "a-different-secret");
    expect(session).toBeNull();
  });

  it("rejects a token whose payload was tampered with", async () => {
    const token = await createSessionToken("user-123", secret, 3600, 0);
    const [payload, sig] = token.split(".");
    // Cambiar aunque sea un carácter del payload debe invalidar la firma.
    const tamperedPayload = payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
    const session = await verifySessionToken(`${tamperedPayload}.${sig}`, secret);
    expect(session).toBeNull();
  });

  it("rejects an already-expired token", async () => {
    // maxAgeSeconds negativo → exp queda en el pasado al crearlo.
    const token = await createSessionToken("user-123", secret, -10, 0);
    const session = await verifySessionToken(token, secret);
    expect(session).toBeNull();
  });

  it("defaults sessionVersion to 0 for tokens issued before that field existed", async () => {
    const crypto = globalThis.crypto;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const oldPayload = btoa(JSON.stringify({ sub: "user-123", exp: Date.now() + 3600_000 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(oldPayload));
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const session = await verifySessionToken(`${oldPayload}.${sig}`, secret);
    expect(session).toEqual({ sub: "user-123", sessionVersion: 0 });
  });

  it("rejects malformed tokens (missing payload or signature)", async () => {
    expect(await verifySessionToken("", secret)).toBeNull();
    expect(await verifySessionToken("just-one-part", secret)).toBeNull();
    expect(await verifySessionToken("payload.", secret)).toBeNull();
    expect(await verifySessionToken(".sig", secret)).toBeNull();
  });

  it("rejects a token with a non-JSON or malformed payload even with a matching signature", async () => {
    // Firmamos nosotros mismos un payload que no es el JSON esperado, para
    // simular una firma técnicamente válida sobre datos corruptos.
    const crypto = globalThis.crypto;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const garbagePayload = btoa("not valid json").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(garbagePayload));
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const session = await verifySessionToken(`${garbagePayload}.${sig}`, secret);
    expect(session).toBeNull();
  });
});
