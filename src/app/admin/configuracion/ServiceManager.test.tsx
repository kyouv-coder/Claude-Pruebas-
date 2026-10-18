import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ServiceManager } from "./ServiceManager";

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
  createServiceAction: vi.fn(),
  updateServiceAction: vi.fn(),
  toggleServiceActiveAction: vi.fn(),
  uploadServiceImageAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("ServiceManager - alta de servicio", () => {
  it("limpia el formulario de nuevo servicio tras crearlo con éxito", () => {
    mockState({});
    const { rerender } = render(<ServiceManager services={[]} />);

    const name = screen.getByLabelText(/^Nombre/) as HTMLInputElement;
    const duration = screen.getByLabelText(/^Duración/) as HTMLInputElement;
    const price = screen.getByLabelText(/^Precio/) as HTMLInputElement;

    fireEvent.change(name, { target: { value: "Masaje descontracturante" } });
    fireEvent.change(duration, { target: { value: "60" } });
    fireEvent.change(price, { target: { value: "5000" } });

    // El backend confirmó el alta: useActionState pasa a reportar éxito.
    mockState({ success: "Servicio creado." });
    rerender(<ServiceManager services={[]} />);

    expect(screen.getByText("Servicio creado.")).toBeInTheDocument();
    expect(name.value).toBe("");
    expect(duration.value).toBe("");
    expect(price.value).toBe("");
  });

  it("no limpia el formulario de nuevo servicio cuando la acción devuelve un error", () => {
    mockState({});
    const { rerender } = render(<ServiceManager services={[]} />);

    const name = screen.getByLabelText(/^Nombre/) as HTMLInputElement;
    const duration = screen.getByLabelText(/^Duración/) as HTMLInputElement;
    const price = screen.getByLabelText(/^Precio/) as HTMLInputElement;

    fireEvent.change(name, { target: { value: "Depilación facial" } });
    fireEvent.change(duration, { target: { value: "30" } });
    fireEvent.change(price, { target: { value: "2000" } });

    mockState({ error: "No se pudo crear el servicio." });
    rerender(<ServiceManager services={[]} />);

    expect(screen.getByText("No se pudo crear el servicio.")).toBeInTheDocument();
    expect(name.value).toBe("Depilación facial");
    expect(duration.value).toBe("30");
    expect(price.value).toBe("2000");
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<ServiceManager services={[]} />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<ServiceManager services={[]} />);

    expect(screen.getByRole("button", { name: "Crear servicio" })).toBeEnabled();
  });
});
