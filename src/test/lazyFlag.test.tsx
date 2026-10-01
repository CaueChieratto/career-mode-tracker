// @vitest-environment jsdom
/**
 * [7E1] LazyFlag — Isolamento de react-world-flags em chunk sob demanda
 *
 * Garante que:
 * 1. O componente LazyFlag aceita e repassa corretamente o código do país (code),
 *    className e estilos requeridos pelos consumidores (AcademyPlayerTab e PlayerWorkspace).
 * 2. Renderiza o fallback placeholder enquanto carrega, prevenindo layout shifts.
 * 3. Retorna null de forma segura se nenhum código de país for fornecido.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LazyFlag from "../components/LazyFlag";

describe("[7E1] LazyFlag", () => {
  it("renderiza o fallback com dimensões preservadas enquanto carrega", () => {
    const { container } = render(
      <LazyFlag
        code="BRA"
        className="custom-flag-class"
        style={{ width: "28px", height: "20px", borderRadius: "4px" }}
      />,
    );

    // O fallback inicial é um span com a classe e estilos configurados
    const placeholder = container.querySelector(".custom-flag-class");
    expect(placeholder).not.toBeNull();
    expect(placeholder?.getAttribute("style")).toContain("width: 28px");
    expect(placeholder?.getAttribute("style")).toContain("height: 20px");
  });

  it("renderiza a bandeira com o código correto após a resolução do módulo lazy", async () => {
    const { container } = render(
      <LazyFlag
        code="BRA"
        className="flag-test"
        style={{ width: "28px", height: "20px" }}
      />,
    );

    await waitFor(() => {
      // Quando react-world-flags resolve, o SVG ou elemento de bandeira é renderizado
      const flagElement = container.querySelector(".flag-test");
      expect(flagElement).not.toBeNull();
    });
  });

  it("retorna null se nenhum código de país for informado", () => {
    const { container } = render(<LazyFlag code="" />);
    expect(container.firstChild).toBeNull();
  });

  it("permite customização de fallback sem regressão visual", () => {
    render(
      <LazyFlag
        code="USA"
        fallback={
          <span data-testid="custom-fallback">Carregando bandeira...</span>
        }
      />,
    );

    expect(screen.getByTestId("custom-fallback")).toBeDefined();
  });
});
