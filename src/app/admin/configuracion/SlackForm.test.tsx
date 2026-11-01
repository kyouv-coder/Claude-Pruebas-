import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SlackForm } from "./SlackForm";

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
  updateSlackWebhookAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockState(state: ActionState, pending = false) {
  useActionStateMock.mockReturnValue([state, vi.fn(), pending]);
}

describe("SlackForm", () => {
  it("muestra el mensaje de notificaciones activas cuando ya hay una URL configurada", () => {
    mockState({});
    render(<SlackForm currentUrl="https://hooks.slack.com/services/abc" />);

    expect(
      screen.getByText("Las notificaciones de nuevas reservas se están enviando a Slack.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Webhook URL de Slack/)).toHaveValue(
      "https://hooks.slack.com/services/abc"
    );
  });

  it("muestra el mensaje de configuración inicial cuando no hay URL guardada", () => {
    mockState({});
    render(<SlackForm currentUrl={null} />);

    expect(
      screen.getByText(/Pegá la URL de un Incoming Webhook de Slack/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Webhook URL de Slack/)).toHaveValue("");
  });

  it("muestra el mensaje de error devuelto por la acción", () => {
    mockState({ error: "No se pudo guardar el webhook." });
    render(<SlackForm currentUrl={null} />);

    expect(screen.getByText("No se pudo guardar el webhook.")).toBeInTheDocument();
  });

  it("muestra el mensaje de éxito devuelto por la acción", () => {
    mockState({ success: "Webhook guardado." });
    render(<SlackForm currentUrl={null} />);

    expect(screen.getByText("Webhook guardado.")).toBeInTheDocument();
  });

  it("deshabilita el botón de envío mientras la acción está pendiente", () => {
    mockState({}, true);
    render(<SlackForm currentUrl={null} />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("habilita el botón de envío cuando no hay una acción en curso", () => {
    mockState({});
    render(<SlackForm currentUrl={null} />);

    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });
});
