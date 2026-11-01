import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { BusinessProfileForm } from "./BusinessProfileForm";

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
  updateBusinessProfileAction: vi.fn(),
  uploadBusinessCoverImageAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  useActionStateMock.mockReset();
});

function mockStates(
  profile: [ActionState, boolean] = [{}, false],
  image: [ActionState, boolean] = [{}, false]
) {
  useActionStateMock
    .mockReturnValueOnce([profile[0], vi.fn(), profile[1]])
    .mockReturnValueOnce([image[0], vi.fn(), image[1]]);
}

describe("BusinessProfileForm", () => {
  it("muestra los valores iniciales de descripción y dirección", () => {
    mockStates();
    render(
      <BusinessProfileForm
        description="Spa de relax"
        address="Av. Siempre Viva 123"
        hasCoverImage={false}
      />
    );

    expect(screen.getByLabelText("Descripción")).toHaveValue("Spa de relax");
    expect(screen.getByLabelText("Dirección")).toHaveValue("Av. Siempre Viva 123");
  });

  it("no muestra la imagen de portada actual cuando no hay una guardada", () => {
    mockStates();
    render(<BusinessProfileForm description="" address="" hasCoverImage={false} />);

    expect(screen.queryByAltText("Foto de portada actual")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Foto de portada")).toBeInTheDocument();
  });

  it("muestra la imagen de portada actual y el label de reemplazo cuando ya hay una guardada", () => {
    mockStates();
    render(<BusinessProfileForm description="" address="" hasCoverImage={true} />);

    expect(screen.getByAltText("Foto de portada actual")).toBeInTheDocument();
    expect(screen.getByLabelText("Reemplazar foto de portada")).toBeInTheDocument();
  });

  it("muestra el error del formulario de perfil", () => {
    mockStates([{ error: "No se pudo guardar el perfil." }, false]);
    render(<BusinessProfileForm description="" address="" hasCoverImage={false} />);

    expect(screen.getByText("No se pudo guardar el perfil.")).toBeInTheDocument();
  });

  it("muestra el éxito del formulario de perfil", () => {
    mockStates([{ success: "Perfil actualizado." }, false]);
    render(<BusinessProfileForm description="" address="" hasCoverImage={false} />);

    expect(screen.getByText("Perfil actualizado.")).toBeInTheDocument();
  });

  it("deshabilita el botón de guardar perfil mientras está pendiente", () => {
    mockStates([{}, true]);
    render(<BusinessProfileForm description="" address="" hasCoverImage={false} />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("muestra el error del formulario de imagen de portada", () => {
    mockStates([{}, false], [{ error: "No se pudo subir la imagen." }, false]);
    render(<BusinessProfileForm description="" address="" hasCoverImage={false} />);

    expect(screen.getByText("No se pudo subir la imagen.")).toBeInTheDocument();
  });

  it("muestra el éxito del formulario de imagen de portada", () => {
    mockStates([{}, false], [{ success: "Imagen subida." }, false]);
    render(<BusinessProfileForm description="" address="" hasCoverImage={false} />);

    expect(screen.getByText("Imagen subida.")).toBeInTheDocument();
  });

  it("deshabilita el botón de subir foto mientras está pendiente", () => {
    mockStates([{}, false], [{}, true]);
    render(<BusinessProfileForm description="" address="" hasCoverImage={false} />);

    expect(screen.getByRole("button", { name: "Subiendo…" })).toBeDisabled();
  });

  it("habilita ambos botones cuando no hay acciones en curso", () => {
    mockStates();
    render(<BusinessProfileForm description="" address="" hasCoverImage={false} />);

    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Subir foto" })).toBeEnabled();
  });
});
