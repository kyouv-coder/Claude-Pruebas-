import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Spa Luna")).toBe("spa-luna");
  });

  it("strips accents", () => {
    expect(slugify("Peluquería Ñandú")).toBe("peluqueria-nandu");
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugify("Café & Té -- Bar!!")).toBe("cafe-te-bar");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  -- Hola Mundo -- ")).toBe("hola-mundo");
  });

  it("returns an empty string for input with no alphanumeric characters", () => {
    expect(slugify("!!!")).toBe("");
  });
});
