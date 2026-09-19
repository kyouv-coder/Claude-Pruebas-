import { describe, expect, it } from "vitest";
import { toCsv, csvResponse } from "./csv";

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

describe("csvResponse", () => {
  it("strips double quotes and CR/LF from the filename before building the header", () => {
    const response = csvResponse("a,b\n1,2", 'ventas".csv');
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="ventas.csv"');
  });

  it("strips CR/LF that could be used for header injection", () => {
    const response = csvResponse("a,b\n1,2", "ventas\r\nX-Injected: 1.csv");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="ventasX-Injected: 1.csv"'
    );
  });

  it("leaves a normal filename untouched", () => {
    const response = csvResponse("a,b\n1,2", "ventas-2026-01.csv");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="ventas-2026-01.csv"'
    );
  });
});
