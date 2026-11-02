import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { BusinessHoursForm } from "./BusinessHoursForm";
import { DAY_NAMES, type DayHours } from "@/lib/business-hours-shared";

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
  updateBusinessHoursAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

function buildHours(overrides: Partial<Record<number, Partial<DayHours>>> = {}): DayHours[] {
  return DAY_NAMES.map((_, dayOfWeek) => ({
    dayOfWeek,
    openTime: "09:00",
    closeTime: "18:00",
    closed: dayOfWeek === 0,
    ...overrides[dayOfWeek],
  }));
}

describe("BusinessHoursForm", () => {
  it("precarga los horarios y el estado de cerrado de cada día", () => {
    mockState({});
    render(<BusinessHoursForm hours={buildHours()} isConfigured />);

    expect(screen.getByLabelText("Hora de apertura los lunes")).toHaveValue("09:00");
    expect(screen.getByLabelText("Hora de cierre los lunes")).toHaveValue("18:00");
    expect(
      screen.getAllByRole("checkbox", { name: "Cerrado" }).length
    ).toBe(DAY_NAMES.length);
  });

  it("marca el checkbox de cerrado para los días configurados como cerrados", () => {
    mockState({});
    render(<BusinessHoursForm hours={buildHours()} isConfigured />);

    const checkboxes = screen.getAllByRole("checkbox", { name: "Cerrado" });
    // Domingo es el primer día listado (dayOfWeek 0) y está cerrado.
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it("muestra el aviso de reserva sin restricciones cuando no está configurado", () => {
    mockState({});
    render(<BusinessHoursForm hours={buildHours()} isConfigured={false} />);

    expect(
      screen.getByText(/la reserva pública no restringe ningún día ni hora/)
    ).toBeInTheDocument();
  });

  it("muestra el aviso de restricción cuando ya está configurado", () => {
    mockState({});
    render(<BusinessHoursForm hours={buildHours()} isConfigured />);

    expect(
      screen.getByText(/solo permite elegir horarios dentro de este rango/)
    ).toBeInTheDocument();
  });

  it("muestra el mensaje de error devuelto por la acción", () => {
    mockState({ error: "Horario inválido." });
    render(<BusinessHoursForm hours={buildHours()} isConfigured />);

    expect(screen.getByText("Horario inválido.")).toBeInTheDocument();
  });

  it("muestra el mensaje de éxito devuelto por la acción", () => {
    mockState({ success: "Horario guardado." });
    render(<BusinessHoursForm hours={buildHours()} isConfigured />);

    expect(screen.getByText("Horario guardado.")).toBeInTheDocument();
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<BusinessHoursForm hours={buildHours()} isConfigured />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<BusinessHoursForm hours={buildHours()} isConfigured />);

    expect(screen.getByRole("button", { name: "Guardar horario" })).toBeEnabled();
  });
});
