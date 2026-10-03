import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatTime, formatDateTime } from "./format";

describe("formatCurrency", () => {
  it("formats a positive amount as ARS currency with decimals", () => {
    expect(formatCurrency(1500)).toContain("1.500,00");
    expect(formatCurrency(1500)).toContain("$");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toContain("0,00");
  });

  it("formats negative amounts with a leading minus", () => {
    expect(formatCurrency(-250.5)).toMatch(/^-\$\s?250,50$/);
  });

  it("formats large amounts with thousands separators", () => {
    expect(formatCurrency(1234567.89)).toContain("1.234.567,89");
  });
});

describe("formatDate", () => {
  it("formats a date as dd/mm/aaaa", () => {
    expect(formatDate(new Date(2024, 2, 5))).toBe("5/3/2024");
  });
});

describe("formatTime", () => {
  it("formats a time including minutes", () => {
    expect(formatTime(new Date(2024, 2, 5, 9, 30))).toContain(":30");
  });

  it("pads single-digit minutes", () => {
    expect(formatTime(new Date(2024, 2, 5, 0, 5))).toContain(":05");
  });
});

describe("formatDateTime", () => {
  it("includes both date and time", () => {
    const result = formatDateTime(new Date(2024, 2, 5, 9, 30));
    expect(result).toContain("5/3/2024");
    expect(result).toContain(":30");
  });
});
