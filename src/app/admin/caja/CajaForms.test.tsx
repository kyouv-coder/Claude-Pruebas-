import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  OpenCashForm,
  CloseCashForm,
  SellGiftCardForm,
  SellProductForm,
  ChargeBookingForm,
  RedeemGiftCardForm,
} from "./CajaForms";

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
  openCashSessionAction: vi.fn(),
  closeCashSessionAction: vi.fn(),
  sellGiftCardAction: vi.fn(),
  redeemGiftCardAction: vi.fn(),
  sellProductAction: vi.fn(),
  chargeBookingAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("OpenCashForm", () => {
  it("renderiza el botón en estado normal", () => {
    mockState({});
    render(<OpenCashForm />);
    expect(screen.getByRole("button", { name: "Abrir caja" })).toBeEnabled();
  });

  it("muestra el botón deshabilitado y el texto de carga mientras pending", () => {
    mockState({}, true);
    render(<OpenCashForm />);
    expect(screen.getByRole("button", { name: "Abriendo…" })).toBeDisabled();
  });

  it("muestra el mensaje de error devuelto por la action", () => {
    mockState({ error: "Ingresá un monto inicial válido." });
    render(<OpenCashForm />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ingresá un monto inicial válido."
    );
  });

  it("muestra el mensaje de éxito devuelto por la action", () => {
    mockState({ success: "Caja abierta." });
    render(<OpenCashForm />);
    expect(screen.getByRole("status")).toHaveTextContent("Caja abierta.");
  });
});

describe("CloseCashForm", () => {
  it("incluye el sessionId como campo oculto", () => {
    mockState({});
    render(<CloseCashForm sessionId="session-1" />);
    const hidden = document.querySelector('input[name="sessionId"]') as HTMLInputElement;
    expect(hidden.value).toBe("session-1");
  });

  it("deshabilita el botón y cambia el texto mientras pending", () => {
    mockState({}, true);
    render(<CloseCashForm sessionId="session-1" />);
    expect(screen.getByRole("button", { name: "Cerrando…" })).toBeDisabled();
  });

  it("muestra el error de la action", () => {
    mockState({ error: "No se encontró una caja abierta con ese ID." });
    render(<CloseCashForm sessionId="session-1" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se encontró una caja abierta con ese ID."
    );
  });
});

describe("SellGiftCardForm", () => {
  it("renderiza todos los campos esperados", () => {
    mockState({});
    render(<SellGiftCardForm cashSessionId="cash-1" />);
    expect(screen.getByLabelText(/Nombre del cliente/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Monto/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha de vencimiento/)).toBeInTheDocument();
  });

  it("muestra el error cuando el monto es inválido", () => {
    mockState({ error: "El monto debe ser un número mayor a 0." });
    render(<SellGiftCardForm cashSessionId="cash-1" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El monto debe ser un número mayor a 0."
    );
  });

  it("permite tipear en los campos de texto", () => {
    mockState({});
    render(<SellGiftCardForm cashSessionId="cash-1" />);
    const nameInput = screen.getByLabelText(/Nombre del cliente/);
    fireEvent.change(nameInput, { target: { value: "Juana Pérez" } });
    expect(nameInput).toHaveValue("Juana Pérez");
  });
});

describe("SellProductForm", () => {
  it("muestra un mensaje cuando no hay productos con stock", () => {
    mockState({});
    render(<SellProductForm cashSessionId="cash-1" products={[]} />);
    expect(
      screen.getByText("No hay productos con stock disponible. Cargalos en Configuración.")
    ).toBeInTheDocument();
  });

  it("lista los productos disponibles en el selector", () => {
    mockState({});
    render(
      <SellProductForm
        cashSessionId="cash-1"
        products={[{ id: "p1", name: "Shampoo", price: 1000, stock: 5 }]}
      />
    );
    expect(screen.getByRole("option", { name: /Shampoo/ })).toBeInTheDocument();
  });

  it("muestra el texto de carga mientras pending", () => {
    mockState({}, true);
    render(
      <SellProductForm
        cashSessionId="cash-1"
        products={[{ id: "p1", name: "Shampoo", price: 1000, stock: 5 }]}
      />
    );
    expect(screen.getByRole("button", { name: "Vendiendo…" })).toBeDisabled();
  });
});

describe("ChargeBookingForm", () => {
  it("incluye bookingId y cashSessionId como campos ocultos", () => {
    mockState({});
    render(<ChargeBookingForm bookingId="booking-1" cashSessionId="cash-1" />);
    const bookingInput = document.querySelector(
      'input[name="bookingId"]'
    ) as HTMLInputElement;
    const sessionInput = document.querySelector(
      'input[name="cashSessionId"]'
    ) as HTMLInputElement;
    expect(bookingInput.value).toBe("booking-1");
    expect(sessionInput.value).toBe("cash-1");
  });

  it("muestra el error de la action cuando ya fue cobrado", () => {
    mockState({ error: "Este turno ya fue cobrado." });
    render(<ChargeBookingForm bookingId="booking-1" cashSessionId="cash-1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Este turno ya fue cobrado.");
  });

  it("deshabilita el botón mientras pending", () => {
    mockState({}, true);
    render(<ChargeBookingForm bookingId="booking-1" cashSessionId="cash-1" />);
    expect(screen.getByRole("button", { name: "Cobrando…" })).toBeDisabled();
  });
});

describe("RedeemGiftCardForm", () => {
  it("renderiza los campos de código y monto", () => {
    mockState({});
    render(<RedeemGiftCardForm cashSessionId="cash-1" />);
    expect(screen.getByLabelText(/Código de giftcard/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Monto a canjear/)).toBeInTheDocument();
  });

  it("muestra el error cuando no se encuentra la giftcard", () => {
    mockState({ error: "No se encontró ninguna giftcard con ese código." });
    render(<RedeemGiftCardForm cashSessionId="cash-1" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se encontró ninguna giftcard con ese código."
    );
  });

  it("muestra el mensaje de éxito al canjear", () => {
    mockState({ success: "Giftcard canjeada." });
    render(<RedeemGiftCardForm cashSessionId="cash-1" />);
    expect(screen.getByRole("status")).toHaveTextContent("Giftcard canjeada.");
  });
});
