import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ExpenseList } from "./ExpenseList";

const { deleteExpenseActionMock } = vi.hoisted(() => ({
  deleteExpenseActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  deleteExpenseAction: deleteExpenseActionMock,
}));

const expense = {
  id: "exp-1",
  date: "2026-10-15",
  category: "INSUMOS",
  description: "Compra de insumos",
  amount: 1500,
};

afterEach(() => {
  cleanup();
  deleteExpenseActionMock.mockReset();
  vi.restoreAllMocks();
});

describe("ExpenseList", () => {
  it("muestra un mensaje cuando no hay gastos cargados", () => {
    render(<ExpenseList expenses={[]} />);

    expect(
      screen.getByText("No hay gastos cargados para este mes.")
    ).toBeInTheDocument();
  });

  it("pide confirmación antes de borrar y no llama a la acción si se cancela", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ExpenseList expenses={[expense]} />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(window.confirm).toHaveBeenCalledWith("¿Eliminar este gasto?");
    expect(deleteExpenseActionMock).not.toHaveBeenCalled();
  });

  it("llama a la acción de borrado cuando se confirma", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ExpenseList expenses={[expense]} />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(deleteExpenseActionMock).toHaveBeenCalledWith("exp-1");
  });

  it("muestra la fecha, categoría, descripción y monto del gasto", () => {
    render(<ExpenseList expenses={[expense]} />);

    expect(screen.getByText(/Insumos/)).toBeInTheDocument();
    expect(screen.getByText("Compra de insumos")).toBeInTheDocument();
    expect(screen.getByText("$ 1.500,00")).toBeInTheDocument();
  });
});
