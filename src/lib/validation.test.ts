import { describe, expect, it } from "vitest";
import { assertFiniteAmount } from "./validation";

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
