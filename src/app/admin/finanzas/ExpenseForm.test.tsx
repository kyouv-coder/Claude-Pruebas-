import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ExpenseForm } from "./ExpenseForm";

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
  createExpenseAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("ExpenseForm", () => {
  it("limpia descripción y monto tras registrar el gasto con éxito", () => {
    mockState({});
    const { rerender } = render(<ExpenseForm />);

    const description = screen.getByLabelText(/^Descripción/) as HTMLInputElement;
    const amount = screen.getByLabelText(/^Monto/) as HTMLInputElement;

    fireEvent.change(description, { target: { value: "Compra de insumos" } });
    fireEvent.change(amount, { target: { value: "1500" } });

    // El backend confirmó el alta: useActionState pasa a reportar éxito.
    mockState({ success: "Gasto registrado." });
    rerender(<ExpenseForm />);

    expect(screen.getByText("Gasto registrado.")).toBeInTheDocument();
    expect(description.value).toBe("");
    expect(amount.value).toBe("");
  });

  it("no limpia los campos cuando la acción devuelve un error", () => {
    mockState({});
    const { rerender } = render(<ExpenseForm />);

    const description = screen.getByLabelText(/^Descripción/) as HTMLInputElement;
    const amount = screen.getByLabelText(/^Monto/) as HTMLInputElement;

    fireEvent.change(description, { target: { value: "Pago de luz" } });
    fireEvent.change(amount, { target: { value: "800" } });

    mockState({ error: "No se pudo registrar el gasto." });
    rerender(<ExpenseForm />);

    expect(screen.getByText("No se pudo registrar el gasto.")).toBeInTheDocument();
    expect(description.value).toBe("Pago de luz");
    expect(amount.value).toBe("800");
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<ExpenseForm />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<ExpenseForm />);

    expect(screen.getByRole("button", { name: "Registrar gasto" })).toBeEnabled();
  });
});
