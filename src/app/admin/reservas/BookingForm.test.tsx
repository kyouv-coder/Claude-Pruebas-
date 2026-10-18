import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { BookingForm } from "./BookingForm";

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
  createBookingAction: vi.fn(),
}));

const services = [{ id: "srv-1", name: "Corte", durationMinutes: 30 }];
const staff = [{ id: "stf-1", name: "Juana Pérez" }];

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("BookingForm - alta rápida de reservas", () => {
  it("limpia el formulario tras crear la reserva con éxito", () => {
    mockState({});
    const { rerender } = render(<BookingForm services={services} staff={staff} />);

    const name = screen.getByLabelText(/^Nombre del cliente/) as HTMLInputElement;
    const phone = screen.getByLabelText(/^Teléfono/) as HTMLInputElement;
    const email = screen.getByLabelText(/^Email/) as HTMLInputElement;
    const serviceSelect = screen.getByLabelText(/^Servicio/) as HTMLSelectElement;
    const staffSelect = screen.getByLabelText(/^Profesional/) as HTMLSelectElement;
    const date = screen.getByLabelText(/^Fecha/) as HTMLInputElement;
    const time = screen.getByLabelText(/^Hora/) as HTMLInputElement;

    fireEvent.change(name, { target: { value: "Carlos Gómez" } });
    fireEvent.change(phone, { target: { value: "1122334455" } });
    fireEvent.change(email, { target: { value: "carlos@mail.com" } });
    fireEvent.change(serviceSelect, { target: { value: "srv-1" } });
    fireEvent.change(staffSelect, { target: { value: "stf-1" } });
    fireEvent.change(date, { target: { value: "2026-11-01" } });
    fireEvent.change(time, { target: { value: "10:00" } });

    // El backend confirmó el alta: useActionState pasa a reportar éxito.
    mockState({ success: "Reserva creada." });
    rerender(<BookingForm services={services} staff={staff} />);

    expect(screen.getByText("Reserva creada.")).toBeInTheDocument();
    expect(name.value).toBe("");
    expect(phone.value).toBe("");
    expect(email.value).toBe("");
    expect(serviceSelect.value).toBe("");
    expect(staffSelect.value).toBe("");
    expect(date.value).toBe("");
    expect(time.value).toBe("");
  });

  it("no limpia el formulario cuando la acción devuelve un error", () => {
    mockState({});
    const { rerender } = render(<BookingForm services={services} staff={staff} />);

    const name = screen.getByLabelText(/^Nombre del cliente/) as HTMLInputElement;
    const serviceSelect = screen.getByLabelText(/^Servicio/) as HTMLSelectElement;
    const staffSelect = screen.getByLabelText(/^Profesional/) as HTMLSelectElement;

    fireEvent.change(name, { target: { value: "Carlos Gómez" } });
    fireEvent.change(serviceSelect, { target: { value: "srv-1" } });
    fireEvent.change(staffSelect, { target: { value: "stf-1" } });

    mockState({ error: "No se pudo crear la reserva." });
    rerender(<BookingForm services={services} staff={staff} />);

    expect(screen.getByText("No se pudo crear la reserva.")).toBeInTheDocument();
    expect(name.value).toBe("Carlos Gómez");
    expect(serviceSelect.value).toBe("srv-1");
    expect(staffSelect.value).toBe("stf-1");
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<BookingForm services={services} staff={staff} />);

    expect(screen.getByRole("button", { name: "Creando…" })).toBeDisabled();
  });

  it("habilita el botón de envío con la etiqueta por defecto cuando no hay una acción en curso", () => {
    mockState({});
    render(<BookingForm services={services} staff={staff} />);

    expect(screen.getByRole("button", { name: "Crear reserva" })).toBeEnabled();
  });

  it("acepta un ctaLabel personalizado para el botón", () => {
    mockState({});
    render(<BookingForm services={services} staff={staff} ctaLabel="Agendar" />);

    expect(screen.getByRole("button", { name: "Agendar" })).toBeEnabled();
  });

  it("lista las opciones de servicios y profesionales recibidas por props", () => {
    mockState({});
    render(<BookingForm services={services} staff={staff} />);

    expect(screen.getByText("Corte (30 min)")).toBeInTheDocument();
    expect(screen.getByText("Juana Pérez")).toBeInTheDocument();
  });
});
