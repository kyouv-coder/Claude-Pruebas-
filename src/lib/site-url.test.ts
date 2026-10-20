import { afterEach, describe, expect, it } from "vitest";
import { getSiteUrl } from "./site-url";

const ENV_KEYS = ["NEXT_PUBLIC_APP_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const;

function clearEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe("getSiteUrl", () => {
  afterEach(() => {
    clearEnv();
  });

  it("falls back to localhost when nothing is configured", () => {
    clearEnv();
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("prefers NEXT_PUBLIC_APP_URL when set", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_APP_URL = "https://mi-spa.com/";
    process.env.VERCEL_URL = "deploy-xyz.vercel.app";
    expect(getSiteUrl()).toBe("https://mi-spa.com");
  });

  it("strips trailing slashes from NEXT_PUBLIC_APP_URL", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_APP_URL = "https://mi-spa.com///";
    expect(getSiteUrl()).toBe("https://mi-spa.com");
  });

  it("ignores NEXT_PUBLIC_APP_URL when it is blank", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_APP_URL = "   ";
    process.env.VERCEL_URL = "deploy-xyz.vercel.app";
    expect(getSiteUrl()).toBe("https://deploy-xyz.vercel.app");
  });

  it("prefers VERCEL_PROJECT_PRODUCTION_URL over VERCEL_URL", () => {
    clearEnv();
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "mi-spa.vercel.app";
    process.env.VERCEL_URL = "deploy-xyz.vercel.app";
    expect(getSiteUrl()).toBe("https://mi-spa.vercel.app");
  });

  it("falls back to VERCEL_URL when VERCEL_PROJECT_PRODUCTION_URL is absent", () => {
    clearEnv();
    process.env.VERCEL_URL = "deploy-xyz.vercel.app";
    expect(getSiteUrl()).toBe("https://deploy-xyz.vercel.app");
  });

  it("strips trailing slashes from the Vercel URL", () => {
    clearEnv();
    process.env.VERCEL_URL = "deploy-xyz.vercel.app/";
    expect(getSiteUrl()).toBe("https://deploy-xyz.vercel.app");
  });
});
