import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FormField, FormError, FormSuccess } from "./FormField";

describe("FormField", () => {
  it("asocia el label al campo y no muestra asterisco si no es requerido", () => {
    render(
      <FormField label="Nombre" htmlFor="nombre">
        <input id="nombre" />
      </FormField>
    );

    const input = screen.getByLabelText("Nombre");
    expect(input).toBeInTheDocument();
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("muestra el asterisco cuando el campo es requerido", () => {
    render(
      <FormField label="Email" htmlFor="email" required>
        <input id="email" />
      </FormField>
    );

    expect(screen.getByText("*")).toBeInTheDocument();
  });
});

describe("FormError", () => {
  it("no renderiza nada sin mensaje", () => {
    render(<FormError message={null} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("muestra el mensaje de error cuando se provee", () => {
    render(<FormError message="Campo inválido" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Campo inválido");
  });
});

describe("FormSuccess", () => {
  it("no renderiza nada sin mensaje", () => {
    render(<FormSuccess message={undefined} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("muestra el mensaje de éxito cuando se provee", () => {
    render(<FormSuccess message="Guardado con éxito" />);
    expect(screen.getByRole("status")).toHaveTextContent("Guardado con éxito");
  });
});
