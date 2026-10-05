import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

// Este endpoint lo llama un cron externo (Vercel Cron) para mandar el email
// diario de reservas a cada negocio — no requiere sesión de usuario, solo el
// header `Authorization: Bearer <CRON_SECRET>`. Confirmado antes en el README
// que, sin chequear explícitamente que CRON_SECRET esté configurado, la
// comparación caía en el string adivinable "Bearer undefined". Estos tests
// cubren esa autenticación sin tocar la base (no llegan a consultarla si el
// auth falla).
describe("GET /api/cron/daily-bookings — autenticación", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("rejects the request with 401 when CRON_SECRET is not configured, even without an Authorization header", async () => {
    delete process.env.CRON_SECRET;
    const request = new NextRequest("http://localhost/api/cron/daily-bookings");

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("rejects the request with 401 when CRON_SECRET is not configured, even if someone sends 'Bearer undefined'", async () => {
    delete process.env.CRON_SECRET;
    const request = new NextRequest("http://localhost/api/cron/daily-bookings", {
      headers: { authorization: "Bearer undefined" },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("rejects the request with 401 when the Authorization header doesn't match CRON_SECRET", async () => {
    process.env.CRON_SECRET = "the-real-secret";
    const request = new NextRequest("http://localhost/api/cron/daily-bookings", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("rejects the request with 401 when there's no Authorization header at all", async () => {
    process.env.CRON_SECRET = "the-real-secret";
    const request = new NextRequest("http://localhost/api/cron/daily-bookings");

    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
