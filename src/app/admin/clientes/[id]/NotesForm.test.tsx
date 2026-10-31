import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NotesForm } from "./NotesForm";

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

vi.mock("../actions", () => ({
  updateClientNotesAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("NotesForm", () => {
  it("muestra las notas existentes del cliente en el textarea", () => {
    mockState({});
    render(<NotesForm clientId="client-1" notes="Alérgico al látex" />);

    expect(screen.getByRole("textbox")).toHaveValue("Alérgico al látex");
  });

  it("muestra el textarea vacío cuando el cliente no tiene notas", () => {
    mockState({});
    render(<NotesForm clientId="client-1" notes={null} />);

    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("incluye el id del cliente como campo oculto del formulario", () => {
    mockState({});
    const { container } = render(<NotesForm clientId="client-42" notes="" />);

    const hidden = container.querySelector('input[name="id"]') as HTMLInputElement;
    expect(hidden.value).toBe("client-42");
  });

  it("muestra el mensaje de éxito devuelto por la acción", () => {
    mockState({ success: "Notas guardadas." });
    render(<NotesForm clientId="client-1" notes="" />);

    expect(screen.getByText("Notas guardadas.")).toBeInTheDocument();
  });

  it("muestra el mensaje de error devuelto por la acción", () => {
    mockState({ error: "No se pudieron guardar las notas." });
    render(<NotesForm clientId="client-1" notes="" />);

    expect(screen.getByText("No se pudieron guardar las notas.")).toBeInTheDocument();
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<NotesForm clientId="client-1" notes="" />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<NotesForm clientId="client-1" notes="" />);

    expect(screen.getByRole("button", { name: "Guardar notas" })).toBeEnabled();
  });
});
