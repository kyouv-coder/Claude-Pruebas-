import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PasswordForm } from "./PasswordForm";

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
  changePasswordAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("PasswordForm", () => {
  it("limpia los tres campos tras un cambio de contraseña exitoso", () => {
    mockState({});
    const { rerender } = render(<PasswordForm />);

    const current = screen.getByLabelText(/^Contraseña actual/) as HTMLInputElement;
    const next = screen.getByLabelText(/^Nueva contraseña/) as HTMLInputElement;
    const confirm = screen.getByLabelText(/^Confirmar nueva contraseña/) as HTMLInputElement;

    fireEvent.change(current, { target: { value: "actual123" } });
    fireEvent.change(next, { target: { value: "nueva12345" } });
    fireEvent.change(confirm, { target: { value: "nueva12345" } });

    // El backend confirmó el cambio: useActionState pasa a reportar éxito.
    mockState({ success: "Contraseña actualizada." });
    rerender(<PasswordForm />);

    expect(screen.getByText("Contraseña actualizada.")).toBeInTheDocument();
    expect(current.value).toBe("");
    expect(next.value).toBe("");
    expect(confirm.value).toBe("");
  });

  it("no limpia los campos cuando la acción devuelve un error", () => {
    mockState({});
    const { rerender } = render(<PasswordForm />);

    const current = screen.getByLabelText(/^Contraseña actual/) as HTMLInputElement;
    fireEvent.change(current, { target: { value: "algo-que-el-usuario-escribio" } });

    mockState({ error: "La contraseña actual es incorrecta." });
    rerender(<PasswordForm />);

    expect(screen.getByText("La contraseña actual es incorrecta.")).toBeInTheDocument();
    expect(current.value).toBe("algo-que-el-usuario-escribio");
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<PasswordForm />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<PasswordForm />);

    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeEnabled();
  });
});
