import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CancelBookingButton } from "./CancelBookingButton";

const { cancelBookingActionMock } = vi.hoisted(() => ({
  cancelBookingActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  cancelBookingAction: cancelBookingActionMock,
}));

afterEach(() => {
  cleanup();
  cancelBookingActionMock.mockReset();
  vi.restoreAllMocks();
});

describe("CancelBookingButton", () => {
  it("pide confirmación con el nombre del cliente antes de cancelar", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CancelBookingButton bookingId="b-1" clientName="Ana" />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "¿Cancelar la reserva de Ana? Esta acción no se puede deshacer."
    );
    expect(cancelBookingActionMock).not.toHaveBeenCalled();
  });

  it("llama a la acción de cancelación cuando se confirma", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<CancelBookingButton bookingId="b-1" clientName="Ana" />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(cancelBookingActionMock).toHaveBeenCalledWith("b-1");
  });
});
