import { describe, expect, it } from "vitest";
import { getVerticalCopy, BUSINESS_TYPE_OPTIONS } from "./verticals";

describe("getVerticalCopy", () => {
  it("returns spa vocabulary for SPA", () => {
    expect(getVerticalCopy("SPA").bookingSingular).toBe("reserva");
  });

  it("returns rubro-specific vocabulary for each business type", () => {
    expect(getVerticalCopy("TRANSPORTE").bookingSingular).toBe("viaje");
    expect(getVerticalCopy("PANADERIA_CAFETERIA").bookingSingular).toBe("pedido");
  });

  it("falls back to OTRO when businessType is null or undefined", () => {
    expect(getVerticalCopy(null)).toEqual(getVerticalCopy("OTRO"));
    expect(getVerticalCopy(undefined)).toEqual(getVerticalCopy("OTRO"));
  });

  it("exposes one option per business type with a human label", () => {
    expect(BUSINESS_TYPE_OPTIONS.length).toBeGreaterThan(0);
    for (const option of BUSINESS_TYPE_OPTIONS) {
      expect(option.label).toBe(getVerticalCopy(option.value).label);
    }
  });
});
