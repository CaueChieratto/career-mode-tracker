// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { PlayerStatRow } from "../layout/SectionView/features/ClubTabs/BestPlayersTab/components/PlayerStatRow";
import Styles from "../layout/SectionView/features/ClubTabs/BestPlayersTab/components/PlayerStatRow/PlayerStatRow.module.css";
import { Players } from "../common/interfaces/playersInfo/players";

const mockPlayer = {
  id: "1",
  name: "Erling Haaland",
  position: "ATA",
  sector: "Ataque",
  shirtNumber: "9",
  age: 24,
  nation: "NOR",
  overall: 91,
  ballonDor: 0,
  salary: 100000,
  playerValue: 180000000,
  buy: false,
  captain: false,
  sell: false,
  contractTime: 3,
  contract: [],
  statsLeagues: [],
} as unknown as Players;

describe("PlayerStatRow font color separation", () => {
  afterEach(cleanup);

  it("renderiza o número com a classe stat_number e a palavra/unidade com stat_unit", () => {
    const { container } = render(
      <PlayerStatRow player={mockPlayer} value="1 gol" />,
    );

    const numEl = container.querySelector(`.${Styles.stat_number}`);
    const unitEl = container.querySelector(`.${Styles.stat_unit}`);

    expect(numEl?.textContent).toBe("1");
    expect(unitEl?.textContent?.trim()).toBe("gol");
  });

  it("renderiza decimais e unidades compostas como 2,10 chutes no alvo", () => {
    const { container } = render(
      <PlayerStatRow
        player={mockPlayer}
        value="2,10 chutes no alvo"
        description="por partida"
      />,
    );

    const numEl = container.querySelector(`.${Styles.stat_number}`);
    const unitEl = container.querySelector(`.${Styles.stat_unit}`);
    const descEl = container.querySelector(`.${Styles.stat_description}`);

    expect(numEl?.textContent).toBe("2,10");
    expect(unitEl?.textContent?.trim()).toBe("chutes no alvo");
    expect(descEl?.textContent).toBe("por partida");
  });
});
