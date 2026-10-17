import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AdminSidebar } from "./AdminSidebar";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

afterEach(() => {
  cleanup();
});

describe("AdminSidebar", () => {
  it("resalta el link exacto de la ruta actual", () => {
    usePathnameMock.mockReturnValue("/admin/reservas");
    render(<AdminSidebar isAdmin={false} logoutAction={() => {}} />);

    expect(screen.getByRole("link", { name: "Reservas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Caja" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("resalta el link de la sección en una subpágina anidada", () => {
    usePathnameMock.mockReturnValue("/admin/clientes/123");
    render(<AdminSidebar isAdmin={false} logoutAction={() => {}} />);

    expect(screen.getByRole("link", { name: "Clientes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("no confunde una ruta que solo comparte el prefijo sin separador", () => {
    usePathnameMock.mockReturnValue("/admin/cajamodificada");
    render(<AdminSidebar isAdmin={false} logoutAction={() => {}} />);

    expect(screen.getByRole("link", { name: "Caja" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("oculta los links de admin cuando isAdmin es falso", () => {
    usePathnameMock.mockReturnValue("/admin/reservas");
    render(<AdminSidebar isAdmin={false} logoutAction={() => {}} />);

    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Finanzas" })).not.toBeInTheDocument();
  });

  it("muestra los links de admin cuando isAdmin es verdadero", () => {
    usePathnameMock.mockReturnValue("/admin/dashboard");
    render(<AdminSidebar isAdmin={true} logoutAction={() => {}} />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Finanzas" })).toBeInTheDocument();
  });

  it("usa las etiquetas personalizadas de rubro para reservas y clientes", () => {
    usePathnameMock.mockReturnValue("/admin/reservas");
    render(
      <AdminSidebar
        isAdmin={false}
        bookingsNavLabel="Turnos"
        clientsNavLabel="Pacientes"
        logoutAction={() => {}}
      />,
    );

    expect(screen.getByRole("link", { name: "Turnos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pacientes" })).toBeInTheDocument();
  });

  it("muestra el nombre del operador y del negocio cuando se provee", () => {
    usePathnameMock.mockReturnValue("/admin/reservas");
    render(
      <AdminSidebar
        isAdmin={false}
        businessName="Spa Luna"
        operatorName="María"
        logoutAction={() => {}}
      />,
    );

    expect(screen.getByText("Spa Luna")).toBeInTheDocument();
    expect(screen.getByText("Conectada como María")).toBeInTheDocument();
  });
});
