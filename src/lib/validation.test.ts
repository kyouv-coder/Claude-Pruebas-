import { describe, expect, it } from "vitest";
import {
  assertFiniteAmount,
  assertMaxLength,
  assertPasswordByteLength,
  sanitizeFileNameForHeader,
  timingSafeEqualStrings,
} from "./validation";

describe("assertFiniteAmount", () => {
  it("acepta un monto positivo finito", () => {
    expect(() => assertFiniteAmount(10, "El monto")).not.toThrow();
  });

  it("rechaza cero por default (mayor a 0)", () => {
    expect(() => assertFiniteAmount(0, "El monto")).toThrow(
      "El monto debe ser un número mayor a 0."
    );
  });

  it("acepta cero cuando allowZero está activado", () => {
    expect(() =>
      assertFiniteAmount(0, "El monto inicial", { allowZero: true })
    ).not.toThrow();
  });

  it("rechaza un monto negativo incluso con allowZero", () => {
    expect(() =>
      assertFiniteAmount(-1, "El monto de cierre", { allowZero: true })
    ).toThrow("El monto de cierre debe ser un número mayor o igual a 0.");
  });

  it("rechaza Infinity", () => {
    expect(() => assertFiniteAmount(Infinity, "El precio", { allowZero: true })).toThrow(
      "El precio debe ser un número mayor o igual a 0."
    );
  });

  it("rechaza NaN", () => {
    expect(() => assertFiniteAmount(NaN, "El monto")).toThrow(
      "El monto debe ser un número mayor a 0."
    );
  });
});

describe("assertMaxLength", () => {
  it("acepta un valor por debajo del máximo", () => {
    expect(() => assertMaxLength("hola", 10, "El nombre")).not.toThrow();
  });

  it("acepta un valor exactamente en el máximo (no es 'demasiado largo')", () => {
    expect(() => assertMaxLength("12345", 5, "El nombre")).not.toThrow();
  });

  it("rechaza un valor que supera el máximo por un solo carácter", () => {
    expect(() => assertMaxLength("123456", 5, "El nombre")).toThrow(
      "El nombre es demasiado largo (máximo 5 caracteres)."
    );
  });

  it("acepta un string vacío", () => {
    expect(() => assertMaxLength("", 5, "El nombre")).not.toThrow();
  });

  it("usa el label recibido en el mensaje de error", () => {
    expect(() => assertMaxLength("demasiado largo", 3, "La dirección")).toThrow(
      "La dirección es demasiado largo (máximo 3 caracteres)."
    );
  });
});

describe("assertPasswordByteLength", () => {
  it("acepta una contraseña ASCII de 72 caracteres (72 bytes)", () => {
    expect(() => assertPasswordByteLength("a".repeat(72))).not.toThrow();
  });

  it("rechaza una contraseña ASCII de 73 caracteres (73 bytes)", () => {
    expect(() => assertPasswordByteLength("a".repeat(73))).toThrow(
      "La contraseña no puede tener más de 72 bytes (los acentos y emojis cuentan más de uno)."
    );
  });

  it("rechaza una contraseña con tildes que tiene 72 caracteres pero más de 72 bytes", () => {
    // "á" ocupa 2 bytes en UTF-8: 36 "á" dan 36 caracteres pero 72 bytes, y
    // agregando más caracteres ASCII hasta llegar a 72 caracteres totales
    // ya supera los 72 bytes aunque `.length` siga diciendo 72.
    const password = "á".repeat(36) + "b".repeat(36);
    expect(password.length).toBe(72);
    expect(() => assertPasswordByteLength(password)).toThrow(
      "La contraseña no puede tener más de 72 bytes (los acentos y emojis cuentan más de uno)."
    );
  });
});

describe("sanitizeFileNameForHeader", () => {
  it("strips double quotes that would break out of the Content-Disposition filename param", () => {
    expect(sanitizeFileNameForHeader('foo".pdf')).toBe("foo.pdf");
  });

  it("strips CR/LF that could be used for header injection", () => {
    expect(sanitizeFileNameForHeader("foo\r\nX-Injected: 1.pdf")).toBe("fooX-Injected: 1.pdf");
  });

  it("leaves a normal file name untouched", () => {
    expect(sanitizeFileNameForHeader("comprobante-enero.pdf")).toBe("comprobante-enero.pdf");
  });
});

describe("timingSafeEqualStrings", () => {
  it("acepta dos strings idénticos", () => {
    expect(timingSafeEqualStrings("Bearer secreto123", "Bearer secreto123")).toBe(true);
  });

  it("rechaza strings distintos del mismo largo", () => {
    expect(timingSafeEqualStrings("Bearer secreto123", "Bearer secreto124")).toBe(false);
  });

  it("rechaza strings de largo distinto sin tirar (timingSafeEqual exige mismo largo)", () => {
    expect(timingSafeEqualStrings("Bearer corto", "Bearer un secreto mucho más largo")).toBe(
      false
    );
  });

  it("rechaza un string vacío contra uno no vacío", () => {
    expect(timingSafeEqualStrings("", "Bearer secreto")).toBe(false);
  });

  it("distingue mayúsculas de minúsculas", () => {
    expect(timingSafeEqualStrings("Bearer Secreto", "Bearer secreto")).toBe(false);
  });
});
