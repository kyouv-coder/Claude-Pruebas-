import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("prefixes formula-injection payloads with an apostrophe", () => {
    const csv = toCsv(
      [{ name: "=cmd|'/c calc'!A1" }, { name: "+1+1" }, { name: "-1" }, { name: "@SUM(A1)" }],
      [{ key: "name", header: "Nombre" }]
    );
    const lines = csv.replace(/^﻿/, "").split("\n");
    expect(lines[1]).toBe("'=cmd|'/c calc'!A1");
    expect(lines[2]).toBe("'+1+1");
    expect(lines[3]).toBe("'-1");
    expect(lines[4]).toBe("'@SUM(A1)");
  });

  it("does not touch values that don't start with a formula trigger character", () => {
    const csv = toCsv([{ name: "Juan Pérez" }], [{ key: "name", header: "Nombre" }]);
    const lines = csv.replace(/^﻿/, "").split("\n");
    expect(lines[1]).toBe("Juan Pérez");
  });

  it("quotes and escapes fields containing commas, quotes or newlines", () => {
    const csv = toCsv(
      [{ name: 'Café "Central", Sucursal Norte' }],
      [{ key: "name", header: "Nombre" }]
    );
    const lines = csv.replace(/^﻿/, "").split("\n");
    expect(lines[1]).toBe('"Café ""Central"", Sucursal Norte"');
  });

  it("prepends a UTF-8 BOM so Excel renders accents correctly", () => {
    const csv = toCsv([{ name: "Ñandú" }], [{ key: "name", header: "Nombre" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});
