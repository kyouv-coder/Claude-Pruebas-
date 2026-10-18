import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { StaffManager } from "./StaffManager";

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
  createStaffAction: vi.fn(),
  updateStaffAction: vi.fn(),
  toggleStaffActiveAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("StaffManager - alta de personal", () => {
  it("limpia el formulario de nueva persona (incluida la contraseña) tras crearla con éxito", () => {
    mockState({});
    const { rerender } = render(<StaffManager staff={[]} />);

    const name = screen.getByLabelText(/^Nombre/) as HTMLInputElement;
    const email = screen.getByLabelText(/^Email/) as HTMLInputElement;
    const password = screen.getByLabelText(/^Contraseña inicial/) as HTMLInputElement;

    fireEvent.change(name, { target: { value: "Juana Pérez" } });
    fireEvent.change(email, { target: { value: "juana@spa.com" } });
    fireEvent.change(password, { target: { value: "unaClaveSegura" } });

    // El backend confirmó el alta: useActionState pasa a reportar éxito.
    mockState({ success: "Persona creada." });
    rerender(<StaffManager staff={[]} />);

    expect(screen.getByText("Persona creada.")).toBeInTheDocument();
    expect(name.value).toBe("");
    expect(email.value).toBe("");
    expect(password.value).toBe("");
  });

  it("no limpia el formulario de nueva persona cuando la acción devuelve un error", () => {
    mockState({});
    const { rerender } = render(<StaffManager staff={[]} />);

    const name = screen.getByLabelText(/^Nombre/) as HTMLInputElement;
    const email = screen.getByLabelText(/^Email/) as HTMLInputElement;
    const password = screen.getByLabelText(/^Contraseña inicial/) as HTMLInputElement;

    fireEvent.change(name, { target: { value: "Carlos Gómez" } });
    fireEvent.change(email, { target: { value: "carlos@spa.com" } });
    fireEvent.change(password, { target: { value: "otraClaveMas" } });

    mockState({ error: "No se pudo crear la persona." });
    rerender(<StaffManager staff={[]} />);

    expect(screen.getByText("No se pudo crear la persona.")).toBeInTheDocument();
    expect(name.value).toBe("Carlos Gómez");
    expect(email.value).toBe("carlos@spa.com");
    expect(password.value).toBe("otraClaveMas");
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<StaffManager staff={[]} />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<StaffManager staff={[]} />);

    expect(screen.getByRole("button", { name: "Agregar" })).toBeEnabled();
  });
});
