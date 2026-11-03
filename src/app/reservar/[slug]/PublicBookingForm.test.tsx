import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PublicBookingForm } from "./PublicBookingForm";

type ActionState = { error?: string; success?: string };

const { useActionStateMock, getBusyTimesActionMock, getDayAvailabilityActionMock } = vi.hoisted(() => ({
  useActionStateMock: vi.fn(),
  getBusyTimesActionMock: vi.fn(),
  getDayAvailabilityActionMock: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: useActionStateMock,
  };
});

vi.mock("./actions", () => ({
  createPublicBookingAction: vi.fn(),
}));

vi.mock("./availability", () => ({
  getBusyTimesAction: getBusyTimesActionMock,
  getDayAvailabilityAction: getDayAvailabilityActionMock,
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
  getBusyTimesActionMock.mockReset();
  getDayAvailabilityActionMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

const services = [
  { id: "svc-1", name: "Corte", durationMinutes: 30, price: 1000 },
  { id: "svc-2", name: "Color", durationMinutes: 60, price: 2000 },
];

const staffMany = [
  { id: "staff-1", name: "Ana" },
  { id: "staff-2", name: "Beto" },
];

const products = [
  {
    id: "prod-1",
    name: "Shampoo",
    description: null,
    price: 500,
    stock: 3,
    hasImage: false,
  },
];

describe("PublicBookingForm", () => {
  it("muestra los campos principales del formulario", () => {
    mockState({});
    render(<PublicBookingForm slug="mi-negocio" services={services} staff={staffMany} products={[]} ctaLabel="Reservar" />);

    expect(screen.getByLabelText("Tu nombre", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Servicio", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Hora", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reservar" })).toBeInTheDocument();
  });

  it("no muestra el selector de profesional cuando hay un solo staff (usa input oculto)", () => {
    mockState({});
    const { container } = render(
      <PublicBookingForm
        slug="mi-negocio"
        services={services}
        staff={[{ id: "staff-1", name: "Ana" }]}
        products={[]}
        ctaLabel="Reservar"
      />
    );

    expect(screen.queryByLabelText("Profesional", { exact: false })).not.toBeInTheDocument();
    const hidden = container.querySelector('input[name="staffId"]');
    expect(hidden).toHaveAttribute("value", "staff-1");
  });

  it("muestra el selector de profesional cuando hay varios", () => {
    mockState({});
    render(<PublicBookingForm slug="mi-negocio" services={services} staff={staffMany} products={[]} ctaLabel="Reservar" />);

    expect(screen.getByLabelText("Profesional", { exact: false })).toBeInTheDocument();
  });

  it("deshabilita el botón de envío cuando no hay servicios", () => {
    mockState({});
    render(<PublicBookingForm slug="mi-negocio" services={[]} staff={staffMany} products={[]} ctaLabel="Reservar" />);

    expect(screen.getByRole("button", { name: "Reservar" })).toBeDisabled();
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<PublicBookingForm slug="mi-negocio" services={services} staff={staffMany} products={[]} ctaLabel="Reservar" />);

    expect(screen.getByRole("button", { name: "Reservando…" })).toBeDisabled();
  });

  it("muestra el error devuelto por la acción", () => {
    mockState({ error: "Elegí fecha y hora." });
    render(<PublicBookingForm slug="mi-negocio" services={services} staff={staffMany} products={[]} ctaLabel="Reservar" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Elegí fecha y hora.");
  });

  it("muestra el mensaje de éxito en lugar del formulario", () => {
    mockState({ success: "¡Listo! Tu reserva quedó agendada." });
    render(<PublicBookingForm slug="mi-negocio" services={services} staff={staffMany} products={[]} ctaLabel="Reservar" />);

    expect(screen.getByText("¡Listo! Tu reserva quedó agendada.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reservar" })).not.toBeInTheDocument();
  });

  it("consulta horarios ocupados y disponibilidad del día al elegir profesional y fecha", async () => {
    mockState({});
    getBusyTimesActionMock.mockResolvedValue([{ start: "10:00", end: "10:30" }]);
    getDayAvailabilityActionMock.mockResolvedValue({
      configured: true,
      closed: false,
      openTime: "09:00",
      closeTime: "18:00",
    });

    render(<PublicBookingForm slug="mi-negocio" services={services} staff={staffMany} products={[]} ctaLabel="Reservar" />);

    fireEvent.change(screen.getByLabelText("Profesional", { exact: false }), {
      target: { value: "staff-1" },
    });
    fireEvent.change(screen.getByLabelText("Fecha", { exact: false }), {
      target: { value: "2026-12-01" },
    });

    await waitFor(() => {
      expect(screen.getByText(/Ocupado ese día: 10:00–10:30/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Horario de atención ese día: 09:00–18:00/)).toBeInTheDocument();
    expect(getBusyTimesActionMock).toHaveBeenCalledWith("mi-negocio", "staff-1", "2026-12-01");
    expect(getDayAvailabilityActionMock).toHaveBeenCalledWith("mi-negocio", "2026-12-01");
  });

  it("muestra que el negocio no atiende ese día cuando dayAvailability.closed es true", async () => {
    mockState({});
    getBusyTimesActionMock.mockResolvedValue([]);
    getDayAvailabilityActionMock.mockResolvedValue({ configured: true, closed: true });

    render(<PublicBookingForm slug="mi-negocio" services={services} staff={staffMany} products={[]} ctaLabel="Reservar" />);

    fireEvent.change(screen.getByLabelText("Fecha", { exact: false }), {
      target: { value: "2026-12-07" },
    });

    await waitFor(() => {
      expect(screen.getByText("El negocio no atiende ese día.")).toBeInTheDocument();
    });
  });

  it("muestra 'sin turnos ocupados' cuando la consulta no devuelve rangos", async () => {
    mockState({});
    getBusyTimesActionMock.mockResolvedValue([]);
    getDayAvailabilityActionMock.mockResolvedValue({ configured: false });

    render(<PublicBookingForm slug="mi-negocio" services={services} staff={staffMany} products={[]} ctaLabel="Reservar" />);

    fireEvent.change(screen.getByLabelText("Profesional", { exact: false }), {
      target: { value: "staff-1" },
    });
    fireEvent.change(screen.getByLabelText("Fecha", { exact: false }), {
      target: { value: "2026-12-01" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("No hay turnos ocupados ese día para este profesional.")
      ).toBeInTheDocument();
    });
  });

  it("ante un error al consultar disponibilidad, no rompe y limpia el estado", async () => {
    mockState({});
    getBusyTimesActionMock.mockRejectedValue(new Error("falló"));
    getDayAvailabilityActionMock.mockRejectedValue(new Error("falló"));

    render(<PublicBookingForm slug="mi-negocio" services={services} staff={staffMany} products={[]} ctaLabel="Reservar" />);

    fireEvent.change(screen.getByLabelText("Profesional", { exact: false }), {
      target: { value: "staff-1" },
    });
    fireEvent.change(screen.getByLabelText("Fecha", { exact: false }), {
      target: { value: "2026-12-01" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("No hay turnos ocupados ese día para este profesional.")
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/Horario de atención ese día/)).not.toBeInTheDocument();
  });

  it("muestra la lista de productos opcionales con su stock como máximo", () => {
    mockState({});
    render(
      <PublicBookingForm
        slug="mi-negocio"
        services={services}
        staff={staffMany}
        products={products}
        ctaLabel="Reservar"
      />
    );

    const qtyInput = screen.getByLabelText("Shampoo", { exact: false }) as HTMLInputElement;
    expect(qtyInput).toHaveAttribute("max", "3");
    expect(qtyInput.value).toBe("0");
  });

  it("clampea la cantidad de producto pedida al stock disponible", () => {
    mockState({});
    const { container } = render(
      <PublicBookingForm
        slug="mi-negocio"
        services={services}
        staff={staffMany}
        products={products}
        ctaLabel="Reservar"
      />
    );

    const qtyInput = screen.getByLabelText("Shampoo", { exact: false }) as HTMLInputElement;
    fireEvent.change(qtyInput, { target: { value: "10" } });

    expect(qtyInput.value).toBe("3");
    const hidden = container.querySelector('input[name="productRequests"]') as HTMLInputElement;
    expect(JSON.parse(hidden.value)).toEqual([{ productId: "prod-1", quantity: 3 }]);
  });

  it("no permite cantidades negativas de producto", () => {
    mockState({});
    render(
      <PublicBookingForm
        slug="mi-negocio"
        services={services}
        staff={staffMany}
        products={products}
        ctaLabel="Reservar"
      />
    );

    const qtyInput = screen.getByLabelText("Shampoo", { exact: false }) as HTMLInputElement;
    fireEvent.change(qtyInput, { target: { value: "-5" } });

    expect(qtyInput.value).toBe("0");
  });

  it("no incluye productos con cantidad cero en productRequests", () => {
    mockState({});
    const { container } = render(
      <PublicBookingForm
        slug="mi-negocio"
        services={services}
        staff={staffMany}
        products={products}
        ctaLabel="Reservar"
      />
    );

    const hidden = container.querySelector('input[name="productRequests"]') as HTMLInputElement;
    expect(JSON.parse(hidden.value)).toEqual([]);
  });
});

// NOTA: deliberadamente no se cubre acá el "race guard" de requestId
// (dos pedidos de disponibilidad en vuelo donde el más lento no debe pisar
// al más nuevo) ni el flujo real de submit contra createPublicBookingAction,
// porque ya está cubierto conceptualmente por availability.test.ts (las
// server actions subyacentes) y por los tests de pending/success/error de
// arriba, que validan el contrato del formulario con el action. Simular
// con precisión el orden de resolución de dos promesas en vuelo agregaría
// fragilidad sin ganancia real de cobertura.
