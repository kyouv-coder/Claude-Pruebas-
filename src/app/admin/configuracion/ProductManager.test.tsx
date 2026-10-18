import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ProductManager } from "./ProductManager";

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
  createProductAction: vi.fn(),
  updateProductAction: vi.fn(),
  toggleProductActiveAction: vi.fn(),
  uploadProductImageAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("ProductManager - alta de producto", () => {
  it("limpia el formulario de nuevo producto tras crearlo con éxito", () => {
    mockState({});
    const { rerender } = render(<ProductManager products={[]} />);

    const name = screen.getByLabelText(/^Nombre/) as HTMLInputElement;
    const price = screen.getByLabelText(/^Precio/) as HTMLInputElement;

    fireEvent.change(name, { target: { value: "Shampoo" } });
    fireEvent.change(price, { target: { value: "2500" } });

    // El backend confirmó el alta: useActionState pasa a reportar éxito.
    mockState({ success: "Producto creado." });
    rerender(<ProductManager products={[]} />);

    expect(screen.getByText("Producto creado.")).toBeInTheDocument();
    expect(name.value).toBe("");
    expect(price.value).toBe("");
  });

  it("no limpia el formulario de nuevo producto cuando la acción devuelve un error", () => {
    mockState({});
    const { rerender } = render(<ProductManager products={[]} />);

    const name = screen.getByLabelText(/^Nombre/) as HTMLInputElement;
    const price = screen.getByLabelText(/^Precio/) as HTMLInputElement;

    fireEvent.change(name, { target: { value: "Acondicionador" } });
    fireEvent.change(price, { target: { value: "3000" } });

    mockState({ error: "No se pudo crear el producto." });
    rerender(<ProductManager products={[]} />);

    expect(screen.getByText("No se pudo crear el producto.")).toBeInTheDocument();
    expect(name.value).toBe("Acondicionador");
    expect(price.value).toBe("3000");
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<ProductManager products={[]} />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<ProductManager products={[]} />);

    expect(screen.getByRole("button", { name: "Crear producto" })).toBeEnabled();
  });
});
