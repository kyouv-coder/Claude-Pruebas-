import "dotenv/config";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { logUnexpectedError } from "@/lib/log";
import * as maintenance from "@/lib/maintenance";

vi.mock("@/lib/log", () => ({ logUnexpectedError: vi.fn() }));

// vi.spyOn directo sobre el módulo falla con "Cannot redefine property" (ver
// el mismo comentario en src/lib/giftcards.test.ts) — hace falta vi.mock con
// importOriginal para poder reemplazar cleanupOldRateLimitAttempts caso por
// caso.
vi.mock("@/lib/maintenance", async (importOriginal) => {
  const actual = await importOriginal<typeof maintenance>();
  return { ...actual, cleanupOldRateLimitAttempts: vi.fn(actual.cleanupOldRateLimitAttempts) };
});

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

// La limpieza de intentos viejos (cleanupOldRateLimitAttempts) es
// mantenimiento incidental de este cron, no su propósito — un error ahí (p.ej.
// un hiccup de DB) no debe impedir que se mande el resumen diario de
// reservas a cada negocio, que es lo que de verdad importa. Antes, un throw
// en la limpieza tiraba abajo el handler entero antes de llegar siquiera a
// leer los negocios.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("GET /api/cron/daily-bookings — falla de mantenimiento no bloquea el envío", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    vi.mocked(maintenance.cleanupOldRateLimitAttempts).mockRestore();
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("still responds 200 and reports businessesNotified when cleanup throws", async () => {
    process.env.CRON_SECRET = "the-real-secret";
    vi.mocked(maintenance.cleanupOldRateLimitAttempts).mockRejectedValueOnce(
      new Error("DB hiccup during cleanup"),
    );
    const request = new NextRequest("http://localhost/api/cron/daily-bookings", {
      headers: { authorization: "Bearer the-real-secret" },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.businessesNotified).toBeTypeOf("number");
    expect(logUnexpectedError).toHaveBeenCalledWith(expect.objectContaining({ message: "DB hiccup during cleanup" }));
  });
});
