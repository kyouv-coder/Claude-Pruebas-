import { describe, expect, it, vi } from "vitest";

// getClientIp llama a next/headers (headers()), que solo funciona dentro de
// un request de Next — se mockea acá para probar la lógica de prioridad de
// headers de forma aislada, sin depender de un server real.
function mockHeaders(values: Record<string, string>) {
  vi.doMock("next/headers", () => ({
    headers: async () => ({
      get: (key: string) => values[key] ?? null,
    }),
  }));
}

describe("getClientIp", () => {
  it("prefers x-real-ip over x-forwarded-for", async () => {
    vi.resetModules();
    mockHeaders({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" });
    const { getClientIp } = await import("./request");
    expect(await getClientIp()).toBe("1.2.3.4");
  });

  it("falls back to the first entry of x-forwarded-for when x-real-ip is missing", async () => {
    vi.resetModules();
    mockHeaders({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" });
    const { getClientIp } = await import("./request");
    expect(await getClientIp()).toBe("5.6.7.8");
  });

  it("returns \"unknown\" when neither header is present", async () => {
    vi.resetModules();
    mockHeaders({});
    const { getClientIp } = await import("./request");
    expect(await getClientIp()).toBe("unknown");
  });
});
