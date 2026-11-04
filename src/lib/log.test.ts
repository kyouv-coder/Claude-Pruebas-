import { describe, expect, it, vi } from "vitest";
import { getSafeErrorMessage, logUnexpectedError } from "./log";

describe("getSafeErrorMessage", () => {
  it("devuelve el mensaje real para un Error común", () => {
    expect(getSafeErrorMessage(new Error("Saldo insuficiente."), "Error genérico")).toBe(
      "Saldo insuficiente."
    );
  });

  it("devuelve el fallback para algo que no es un Error", () => {
    expect(getSafeErrorMessage("un string cualquiera", "Error genérico")).toBe(
      "Error genérico"
    );
    expect(getSafeErrorMessage(null, "Error genérico")).toBe("Error genérico");
    expect(getSafeErrorMessage(undefined, "Error genérico")).toBe("Error genérico");
  });

  // Este es el caso que justifica que el helper exista: un error de Prisma
  // es técnicamente `instanceof Error`, pero su `message` puede traer
  // detalles internos (nombres de tabla/columna, fragmentos de query) que no
  // deberían mostrarse tal cual a un usuario final. Se detecta por duck
  // typing (`clientVersion`), no por `instanceof`, porque importar el
  // paquete de Prisma generado rompe el bundle del navegador en
  // `src/app/error.tsx` (ver comentario en log.ts).
  it("nunca expone e.message para algo con forma de error de Prisma, aunque sea instanceof Error", () => {
    class FakePrismaError extends Error {
      clientVersion = "6.9.0";
    }
    const prismaLikeError = new FakePrismaError(
      "Unique constraint failed on the fields: (`email`)"
    );
    expect(getSafeErrorMessage(prismaLikeError, "Error genérico")).toBe("Error genérico");
  });

  it("también detecta un objeto plano con clientVersion, sin ser instanceof Error", () => {
    const prismaLikeObject = { message: "detalle interno de postgres", clientVersion: "6.9.0" };
    expect(getSafeErrorMessage(prismaLikeObject, "Error genérico")).toBe("Error genérico");
  });
});

describe("logUnexpectedError", () => {
  it("registra el error en consola sin tirar, aunque Sentry esté inactivo (sin SENTRY_DSN)", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("algo inesperado");
    expect(() => logUnexpectedError(error)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(error);
    consoleSpy.mockRestore();
  });
});
