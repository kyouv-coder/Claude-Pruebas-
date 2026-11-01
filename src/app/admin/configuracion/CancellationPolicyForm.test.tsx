import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CancellationPolicyForm } from "./CancellationPolicyForm";

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
  updateCancellationPolicyAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("CancellationPolicyForm", () => {
  it("precarga el texto de la política actual", () => {
    mockState({});
    render(<CancellationPolicyForm currentPolicy="Cancelaciones hasta 24hs antes." />);

    expect(screen.getByLabelText("Política de cancelación")).toHaveValue(
      "Cancelaciones hasta 24hs antes."
    );
  });

  it("muestra el campo vacío cuando no hay política guardada", () => {
    mockState({});
    render(<CancellationPolicyForm currentPolicy={null} />);

    expect(screen.getByLabelText("Política de cancelación")).toHaveValue("");
  });

  it("muestra el mensaje de error devuelto por la acción", () => {
    mockState({ error: "El texto es demasiado largo (máximo 1000 caracteres)." });
    render(<CancellationPolicyForm currentPolicy={null} />);

    expect(
      screen.getByText("El texto es demasiado largo (máximo 1000 caracteres).")
    ).toBeInTheDocument();
  });

  it("muestra el mensaje de éxito devuelto por la acción", () => {
    mockState({ success: "Política de cancelación guardada." });
    render(<CancellationPolicyForm currentPolicy={null} />);

    expect(screen.getByText("Política de cancelación guardada.")).toBeInTheDocument();
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<CancellationPolicyForm currentPolicy={null} />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<CancellationPolicyForm currentPolicy={null} />);

    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });
});
