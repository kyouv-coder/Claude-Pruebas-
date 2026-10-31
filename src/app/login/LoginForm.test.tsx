import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LoginForm } from "./LoginForm";

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
  loginAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("LoginForm", () => {
  it("usa /admin/reservas como destino por defecto", () => {
    mockState({});
    render(<LoginForm />);

    const nextInput = document.querySelector('input[name="next"]') as HTMLInputElement;
    expect(nextInput.value).toBe("/admin/reservas");
  });

  it("usa el destino recibido por prop", () => {
    mockState({});
    render(<LoginForm next="/admin/finanzas" />);

    const nextInput = document.querySelector('input[name="next"]') as HTMLInputElement;
    expect(nextInput.value).toBe("/admin/finanzas");
  });

  it("muestra el error cuando la acción falla", () => {
    mockState({ error: "Email o contraseña incorrectos." });
    render(<LoginForm />);

    expect(screen.getByRole("alert")).toHaveTextContent("Email o contraseña incorrectos.");
  });

  it("no muestra error cuando no hay mensaje", () => {
    mockState({});
    render(<LoginForm />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "Ingresando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
  });
});
