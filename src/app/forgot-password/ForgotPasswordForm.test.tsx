import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

type ActionState = { error?: string; success?: string };

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
  forgotPasswordAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("ForgotPasswordForm", () => {
  it("muestra el formulario cuando no hay éxito", () => {
    mockState({});
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText("Email", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar link" })).toBeInTheDocument();
  });

  it("muestra el error cuando la acción falla", () => {
    mockState({ error: "Ingresá tu email." });
    render(<ForgotPasswordForm />);

    expect(screen.getByRole("alert")).toHaveTextContent("Ingresá tu email.");
  });

  it("no muestra error cuando no hay mensaje", () => {
    mockState({});
    render(<ForgotPasswordForm />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reemplaza el formulario por el mensaje de éxito", () => {
    mockState({ success: "Si existe una cuenta con ese email, te mandamos un link." });
    render(<ForgotPasswordForm />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Si existe una cuenta con ese email, te mandamos un link."
    );
    expect(screen.queryByLabelText("Email", { exact: false })).not.toBeInTheDocument();
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<ForgotPasswordForm />);

    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<ForgotPasswordForm />);

    expect(screen.getByRole("button", { name: "Enviar link" })).toBeEnabled();
  });
});
