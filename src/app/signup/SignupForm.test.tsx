import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SignupForm } from "./SignupForm";

type ActionState = { error?: string };

const { useActionStateMock } = vi.hoisted(() => ({
  useActionStateMock: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: useActionStateMock,
  };
});

vi.mock("./actions", () => ({
  signupAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("SignupForm", () => {
  it("muestra todos los campos del formulario", () => {
    mockState({});
    render(<SignupForm />);

    expect(screen.getByLabelText("Nombre de tu negocio", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Rubro de tu negocio", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Tu nombre", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Email", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear mi cuenta" })).toBeInTheDocument();
  });

  it("no muestra error cuando no hay mensaje", () => {
    mockState({});
    render(<SignupForm />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("muestra el error cuando la acción falla", () => {
    mockState({ error: "Ya existe una cuenta con ese email." });
    render(<SignupForm />);

    expect(screen.getByRole("alert")).toHaveTextContent("Ya existe una cuenta con ese email.");
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<SignupForm />);

    expect(screen.getByRole("button", { name: "Creando cuenta…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<SignupForm />);

    expect(screen.getByRole("button", { name: "Crear mi cuenta" })).toBeEnabled();
  });

  it("incluye los links a términos y política de privacidad", () => {
    mockState({});
    render(<SignupForm />);

    expect(screen.getByRole("link", { name: "Términos de Servicio" })).toHaveAttribute(
      "href",
      "/terminos"
    );
    expect(screen.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute(
      "href",
      "/privacidad"
    );
  });
});
