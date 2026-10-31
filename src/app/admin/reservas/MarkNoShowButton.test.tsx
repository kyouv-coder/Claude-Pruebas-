import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MarkNoShowButton } from "./MarkNoShowButton";

const { markNoShowActionMock } = vi.hoisted(() => ({
  markNoShowActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  markNoShowAction: markNoShowActionMock,
}));

afterEach(() => {
  cleanup();
  markNoShowActionMock.mockReset();
});

describe("MarkNoShowButton", () => {
  it("llama a la acción con el id de la reserva al hacer click", () => {
    render(<MarkNoShowButton bookingId="b-1" />);

    fireEvent.click(screen.getByRole("button", { name: "No se presentó" }));

    expect(markNoShowActionMock).toHaveBeenCalledWith("b-1");
  });
});
