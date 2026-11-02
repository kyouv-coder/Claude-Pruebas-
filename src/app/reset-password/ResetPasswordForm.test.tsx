import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ResetPasswordForm } from "./ResetPasswordForm";

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
  resetPasswordAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("ResetPasswordForm", () => {
  it("muestra los campos de contraseña y el token oculto", () => {
    mockState({});
    const { container } = render(<ResetPasswordForm token="abc123" />);

    expect(screen.getByLabelText("Nueva contraseña", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar contraseña", { exact: false })).toBeInTheDocument();

    const hiddenInput = container.querySelector('input[name="token"]');
    expect(hiddenInput).toHaveValue("abc123");
  });

  it("muestra el error cuando la acción falla", () => {
    mockState({ error: "Las contraseñas no coinciden." });
    render(<ResetPasswordForm token="abc123" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Las contraseñas no coinciden.");
  });

  it("no muestra error cuando no hay mensaje", () => {
    mockState({});
    render(<ResetPasswordForm token="abc123" />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<ResetPasswordForm token="abc123" />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<ResetPasswordForm token="abc123" />);

    expect(screen.getByRole("button", { name: "Restablecer contraseña" })).toBeEnabled();
  });
});
