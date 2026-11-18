// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";
import { player, season } from "./factories/domain";

describe("TransfersPanel - OverflowText com widthReference={170} e Formatação Bicolor", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza texto de Saída agendada com widthReference={170} e duas cores distintas", () => {
    const scheduledPlayer = player({
      id: "p-overflow-exit",
      name: "Pedri González López",
      contract: [
        {
          buyValue: 0,
          sellValue: 120000000,
          fromClub: "",
          leftClub: "Manchester City",
          dataArrival: null,
          dataExit: new Date("2026-08-10"),
          timing: "Proxima Temporada",
          isLoan: false,
        },
      ],
    });

    const testSeason = season({
      id: "s-overflow-1",
      seasonNumber: 1,
      matches: [],
    });

    render(
      <TransfersPanel
        title="Saídas"
        players={[scheduledPlayer]}
        currency="EUR"
        season={testSeason}
      />,
    );

    // 1. O prefixo 'Saída: ' deve ter cor var(--color-add-player)
    const salidaLabel = screen.getByText("Saída:");
    expect(salidaLabel).toBeTruthy();
    expect(salidaLabel.style.color).toBe("var(--color-add-player)");

    // 2. O sufixo 'Proxima Temporada' deve ser verde (#0bb32a)
    const nextSeasonText = screen.getByText("Proxima Temporada");
    expect(nextSeasonText).toBeTruthy();
    expect(nextSeasonText.style.color).toBe("rgb(11, 179, 42)");
  });

  it("renderiza texto de Chegada agendada com widthReference={170} e cor vermelha (#c81419)", () => {
    const arrivalPlayer = player({
      id: "p-overflow-arrival",
      name: "Erling Haaland",
      contract: [
        {
          buyValue: 150000000,
          sellValue: 0,
          fromClub: "Manchester City",
          leftClub: "",
          dataArrival: new Date("2026-08-10"),
          timing: "Proxima Temporada",
          isLoan: false,
        },
      ],
    });

    const testSeason = season({
      id: "s-overflow-2",
      seasonNumber: 1,
      matches: [],
    });

    render(
      <TransfersPanel
        title="Chegadas"
        players={[arrivalPlayer]}
        currency="EUR"
        season={testSeason}
      />,
    );

    const chegadaLabel = screen.getByText("Chegada:");
    expect(chegadaLabel).toBeTruthy();
    expect(chegadaLabel.style.color).toBe("var(--color-add-player)");

    const nextSeasonText = screen.getByText("Proxima Temporada");
    expect(nextSeasonText).toBeTruthy();
    expect(nextSeasonText.style.color).toBe("rgb(200, 20, 25)");
  });

  it("renderiza valor monetário normal sem erro", () => {
    const immediatePlayer = player({
      id: "p-immediate",
      name: "Gavi",
      sell: true,
      contract: [
        {
          buyValue: 0,
          sellValue: 90000000,
          fromClub: "",
          leftClub: "Liverpool",
          dataArrival: null,
          dataExit: new Date("2026-08-01"),
          timing: "Imediata",
          isLoan: false,
        },
      ],
    });

    const testSeason = season({
      id: "s-overflow-3",
      seasonNumber: 1,
      matches: [],
    });

    render(
      <TransfersPanel
        title="Saídas"
        players={[immediatePlayer]}
        currency="EUR"
        season={testSeason}
      />,
    );

    expect(screen.getByText("€90M")).toBeTruthy();
  });
});

