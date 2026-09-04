// Un valor que arranca con =, +, -, @ o tab se interpreta como fórmula al
// abrir el CSV en Excel/Sheets — un nombre de cliente/producto malicioso
// podría ejecutar código (CSV injection). Se neutraliza anteponiendo un
// apóstrofe, el mismo mitigante que recomienda OWASP.
function neutralizeFormula(value: string) {
  return /^[=+\-@\t]/.test(value) ? `'${value}` : value;
}

function escapeCsvField(value: string) {
  const safe = neutralizeFormula(value);
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; header: string }[]
) {
  const header = columns.map((c) => escapeCsvField(c.header)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCsvField(String(row[c.key] ?? "")))
      .join(",")
  );
  // BOM al inicio para que Excel reconozca UTF-8 (tildes, ñ) sin configurarlo a mano.
  return "﻿" + [header, ...lines].join("\n");
}

export function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
