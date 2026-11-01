import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { InvoiceUploadForm } from "./InvoiceUploadForm";

type ActionState = { error?: string; success?: boolean };

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
  uploadSaleInvoiceAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("InvoiceUploadForm", () => {
  it("resetea el formulario (incluido el input de archivo) tras subir con éxito", () => {
    mockState({});
    const { rerender, container } = render(
      <InvoiceUploadForm saleId="sale-1" hasInvoice={false} />,
    );

    const fileInput = screen.getByLabelText("Subir comprobante") as HTMLInputElement;
    const formResetSpy = vi.spyOn(HTMLFormElement.prototype, "reset");

    // El backend confirmó la subida: useActionState pasa a reportar éxito.
    mockState({ success: true });
    rerender(<InvoiceUploadForm saleId="sale-1" hasInvoice={false} />);

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(formResetSpy).toHaveBeenCalled();
    expect(fileInput).toBeInTheDocument();

    formResetSpy.mockRestore();
  });

  it("no resetea el formulario cuando la acción devuelve un error", () => {
    mockState({});
    const { rerender } = render(<InvoiceUploadForm saleId="sale-1" hasInvoice={false} />);

    const formResetSpy = vi.spyOn(HTMLFormElement.prototype, "reset");

    mockState({ error: "No se pudo subir el comprobante." });
    rerender(<InvoiceUploadForm saleId="sale-1" hasInvoice={false} />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo subir el comprobante.");
    expect(formResetSpy).not.toHaveBeenCalled();

    formResetSpy.mockRestore();
  });

  it("deshabilita el botón de envío mientras la acción está pendiente y muestra 'Subiendo…'", () => {
    mockState({}, true);
    render(<InvoiceUploadForm saleId="sale-1" hasInvoice={false} />);

    expect(screen.getByRole("button", { name: "Subiendo…" })).toBeDisabled();
  });

  it("muestra 'Subir' cuando no hay comprobante y no hay acción en curso", () => {
    mockState({});
    render(<InvoiceUploadForm saleId="sale-1" hasInvoice={false} />);

    expect(screen.getByRole("button", { name: "Subir" })).toBeEnabled();
    expect(screen.queryByText("Ver comprobante")).not.toBeInTheDocument();
  });

  it("muestra 'Reemplazar' y el link al comprobante cuando ya existe uno", () => {
    mockState({});
    render(<InvoiceUploadForm saleId="sale-1" hasInvoice={true} />);

    expect(screen.getByRole("button", { name: "Reemplazar" })).toBeEnabled();
    const link = screen.getByRole("link", { name: "Ver comprobante" });
    expect(link).toHaveAttribute("href", "/admin/finanzas/comprobante/sale-1");
    expect(screen.getByLabelText("Reemplazar comprobante")).toBeInTheDocument();
  });
});
