import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { OnboardingChecklist } from "./OnboardingChecklist";
import type { OnboardingStatus } from "@/lib/onboarding";

afterEach(() => {
  cleanup();
});

function status(overrides: Partial<OnboardingStatus> = {}): OnboardingStatus {
  return {
    hasServices: false,
    hasStaff: false,
    hasSlackWebhook: false,
    hasBusinessHours: false,
    isComplete: false,
    ...overrides,
  };
}

describe("OnboardingChecklist", () => {
  it("marca como pendiente un paso obligatorio sin completar", () => {
    render(<OnboardingChecklist status={status()} />);

    const item = screen.getByText(/Cargar al menos un servicio/).closest("li");
    expect(item).toHaveTextContent("(pendiente)");
    expect(item).not.toHaveTextContent("opcional");
  });

  it("marca como completado un paso ya hecho, sin la marca de opcional", () => {
    render(<OnboardingChecklist status={status({ hasServices: true })} />);

    const item = screen.getByText(/Cargar al menos un servicio/).closest("li");
    expect(item).toHaveTextContent("(completado)");
  });

  it("agrega la marca ' — opcional' en pasos opcionales pendientes", () => {
    render(<OnboardingChecklist status={status()} />);

    const slack = screen.getByText(/Conectar Slack/).closest("li");
    expect(slack).toHaveTextContent("— opcional");
  });

  it("no duplica la marca ' — opcional' en un paso opcional ya completado", () => {
    render(<OnboardingChecklist status={status({ hasSlackWebhook: true })} />);

    const slack = screen.getByText(/Conectar Slack/).closest("li");
    expect(slack).toHaveTextContent("(completado)");
    expect(slack).not.toHaveTextContent("— opcional");
  });

  it("linkea a Configuración", () => {
    render(<OnboardingChecklist status={status()} />);

    expect(screen.getByRole("link", { name: /Ir a Configuración/ })).toHaveAttribute(
      "href",
      "/admin/configuracion",
    );
  });
});
