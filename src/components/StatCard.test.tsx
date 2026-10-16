import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("muestra el label y el valor", () => {
    render(<StatCard label="Reservas" value="42" />);

    expect(screen.getByText("Reservas")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("muestra el hint solo cuando se provee", () => {
    const { rerender } = render(<StatCard label="Ingresos" value="$100" />);
    expect(screen.queryByText(/vs\./)).not.toBeInTheDocument();

    rerender(<StatCard label="Ingresos" value="$100" hint="vs. mes anterior" />);
    expect(screen.getByText("vs. mes anterior")).toBeInTheDocument();
  });
});
