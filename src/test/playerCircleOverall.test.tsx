// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PlayerCircle } from "../components/PlayerCircle";
import { UseOverallColor } from "../common/hooks/Colors/GetOverallColor";
import { ColorAssessment } from "../common/types/enums/ColorAssessment";

describe("PlayerCircle - Suporte a Overall Colorido e Retrocompatibilidade", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderização padrão com camisa: exibe o número da camisa quando overall não é fornecido", () => {
    render(<PlayerCircle shirtNumber="10" />);

    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.queryByTestId("person-icon")).toBeNull();
  });

  it("renderização padrão sem camisa: exibe o ícone de silhueta (MdPerson) quando shirtNumber e overall estão ausentes", () => {
    const { container } = render(<PlayerCircle shirtNumber="" />);

    // Deve conter ícone svg de silhueta
    const svgIcon = container.querySelector("svg");
    expect(svgIcon).not.toBeNull();
  });

  it("renderização com overall={88}: exibe 88 com texto branco e background na cor Great (#2B8A3E)", () => {
    const { container } = render(<PlayerCircle shirtNumber="8" overall={88} />);

    const overallSpan = screen.getByText("88");
    expect(overallSpan).toBeTruthy();
    expect(overallSpan.style.color).toBe("rgb(255, 255, 255)");
    expect(overallSpan.style.fontWeight).toBe("bold");

    const circleDiv = container.firstChild as HTMLElement;
    expect(circleDiv.style.backgroundColor).toBe("rgb(43, 138, 62)"); // #2B8A3E em RGB
    expect(circleDiv.style.borderColor).toBe("rgb(43, 138, 62)");
  });

  it("renderização com overall={96}: exibe 96 com texto branco e cor Legendary (#00e1ffff)", () => {
    const { container } = render(
      <PlayerCircle shirtNumber="10" overall={96} />,
    );

    const overallSpan = screen.getByText("96");
    expect(overallSpan).toBeTruthy();
    expect(overallSpan.style.color).toBe("rgb(255, 255, 255)");

    const circleDiv = container.firstChild as HTMLElement;
    // #00e1ffff ou UseOverallColor(96)
    expect(UseOverallColor(96)).toBe(ColorAssessment.Legendary);
    expect(circleDiv.style.backgroundColor).toBeTruthy();
  });

  it("quando showOverall={false}, prioriza o número da camisa mesmo se overall estiver definido", () => {
    render(<PlayerCircle shirtNumber="7" overall={85} showOverall={false} />);

    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.queryByText("85")).toBeNull();
  });

  it("trata overall indefinido ou menor igual a zero com fallback seguro para shirtNumber", () => {
    render(<PlayerCircle shirtNumber="9" overall={0} />);

    expect(screen.getByText("9")).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });
});
