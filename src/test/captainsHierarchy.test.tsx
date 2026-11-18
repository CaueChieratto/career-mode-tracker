// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { getSortedCaptains } from "../layout/SectionView/features/ClubTabs/GeneralTab/components/CaptainsHierarchyCard/helpers/getSortedCaptains";
import { reorderCaptains } from "../layout/SectionView/features/ClubTabs/GeneralTab/components/CaptainsHierarchyCard/helpers/reorderCaptains";
import { CaptainsHierarchyCard } from "../layout/SectionView/features/ClubTabs/GeneralTab/components/CaptainsHierarchyCard";
import { CaptainsHierarchyEditor } from "../layout/SectionView/features/ClubTabs/SquadTab/components/CaptainsHierarchyEditor";
import { Players } from "../common/interfaces/playersInfo/players";
import { ClubData } from "../common/interfaces/club/clubData";

const createMockPlayer = (
  id: string,
  name: string,
  captain: boolean = false,
  captainRank?: number,
  shirtNumber: string = "10",
): Players => ({
  id,
  name,
  overall: 80,
  position: "MC",
  sector: "Meia",
  age: 25,
  salary: 10000,
  nation: "BRA",
  shirtNumber,
  playerValue: 20000000,
  buy: false,
  captain,
  captainRank,
  sell: false,
  contractTime: 3,
  ballonDor: 0,
  contract: [],
  statsLeagues: [],
});

describe("Hierarquia de Capitães - Helpers e Componentes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    document.body.className = "";
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    document.body.className = "";
  });

  describe("getSortedCaptains", () => {
    it("retorna lista vazia se season ou players forem indefinidos", () => {
      expect(getSortedCaptains(undefined)).toEqual([]);
      expect(getSortedCaptains({} as ClubData)).toEqual([]);
    });

    it("respeita a ordem definida em season.captains", () => {
      const p1 = createMockPlayer("p1", "Jogador 1", true);
      const p2 = createMockPlayer("p2", "Jogador 2", true);
      const p3 = createMockPlayer("p3", "Jogador 3", true);

      const season: ClubData = {
        id: "s1",
        seasonNumber: 1,
        players: [p1, p2, p3],
        captains: ["p3", "p1", "p2"],
      };

      const sorted = getSortedCaptains(season);
      expect(sorted.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
    });

    it("ordena por captainRank quando season.captains não está definido", () => {
      const p1 = createMockPlayer("p1", "Jogador 1", true, 3);
      const p2 = createMockPlayer("p2", "Jogador 2", true, 1);
      const p3 = createMockPlayer("p3", "Jogador 3", true, 2);

      const season: ClubData = {
        id: "s1",
        seasonNumber: 1,
        players: [p1, p2, p3],
      };

      const sorted = getSortedCaptains(season);
      expect(sorted.map((p) => p.id)).toEqual(["p2", "p3", "p1"]);
    });

    it("limita rigorosamente a lista ao máximo de 5 capitães", () => {
      const players = [1, 2, 3, 4, 5, 6, 7].map((num) =>
        createMockPlayer(`p${num}`, `Jogador ${num}`, true, num),
      );

      const season: ClubData = {
        id: "s1",
        seasonNumber: 1,
        players,
      };

      const sorted = getSortedCaptains(season);
      expect(sorted).toHaveLength(5);
      expect(sorted.map((p) => p.id)).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    });
  });

  describe("reorderCaptains", () => {
    it("reordena itens e recalcula captainRank sequencial de 1 a N", () => {
      const p1 = createMockPlayer("p1", "Jogador 1", true, 1);
      const p2 = createMockPlayer("p2", "Jogador 2", true, 2);
      const p3 = createMockPlayer("p3", "Jogador 3", true, 3);

      const reordered = reorderCaptains([p1, p2, p3], "p3", "p1");
      expect(reordered.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
      expect(reordered[0].captainRank).toBe(1);
      expect(reordered[1].captainRank).toBe(2);
      expect(reordered[2].captainRank).toBe(3);
    });

    it("retorna lista inalterada quando id de origem ou destino não existem", () => {
      const p1 = createMockPlayer("p1", "Jogador 1", true, 1);
      const initial = [p1];
      const result = reorderCaptains(initial, "unknown", "p1");
      expect(result).toBe(initial);
    });
  });

  describe("CaptainsHierarchyEditor", () => {
    it("exibe aviso quando o limite de 5 capitães foi atingido e o atleta atual não está na lista", () => {
      const initialCaptains = [1, 2, 3, 4, 5].map((num) => ({
        id: `p${num}`,
        name: `Capitão ${num}`,
        shirtNumber: String(num),
        position: "MC",
      }));

      const currentPlayer = {
        id: "new_player",
        name: "Novo Candidato",
        shirtNumber: "99",
        position: "ATA",
      };

      render(
        <CaptainsHierarchyEditor
          initialCaptains={initialCaptains}
          currentPlayer={currentPlayer}
          onChangeOrder={vi.fn()}
        />,
      );

      expect(
        screen.getByText(/O limite de 5 capitães foi atingido/i),
      ).not.toBeNull();
    });

    it("permite movimentação na ordem com botões de subir e descer", () => {
      const onChangeOrder = vi.fn();
      const initialCaptains = [
        { id: "p1", name: "Capitão 1", shirtNumber: "1", position: "MC" },
        { id: "p2", name: "Capitão 2", shirtNumber: "2", position: "ZAG" },
      ];
      const currentPlayer = {
        id: "p2",
        name: "Capitão 2",
        shirtNumber: "2",
        position: "ZAG",
      };

      render(
        <CaptainsHierarchyEditor
          initialCaptains={initialCaptains}
          currentPlayer={currentPlayer}
          onChangeOrder={onChangeOrder}
        />,
      );

      const upButtons = screen.getAllByLabelText(/Subir capitão/i);
      fireEvent.click(upButtons[1]);

      expect(onChangeOrder).toHaveBeenCalled();
    });
  });

  describe("CaptainsHierarchyCard", () => {
    it("não renderiza nada caso não haja nenhum capitão", () => {
      const season: ClubData = {
        id: "s1",
        seasonNumber: 1,
        players: [createMockPlayer("p1", "Jogador Comum", false)],
      };

      const { container } = render(
        <CaptainsHierarchyCard careerId="c1" season={season} readOnly={false} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("renderiza lista com handles quando readOnly é false e oculta handles quando readOnly é true", () => {
      const p1 = createMockPlayer("p1", "Alisson", true, 1, "1");
      const p2 = createMockPlayer("p2", "Van Dijk", true, 2, "4");

      const season: ClubData = {
        id: "s1",
        seasonNumber: 1,
        players: [p1, p2],
        captains: ["p1", "p2"],
      };

      // 1. Renderização editável (readOnly: false)
      const { rerender } = render(
        <CaptainsHierarchyCard careerId="c1" season={season} readOnly={false} />,
      );

      expect(screen.getByText("Capitães")).not.toBeNull();
      expect(screen.getAllByText(/Alisson/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Van Dijk/).length).toBeGreaterThan(0);
      expect(screen.getByText("#1")).not.toBeNull(); // hierarquia numérica #1 no rank_badge
      expect(screen.getByText("#2")).not.toBeNull(); // hierarquia numérica #2 no rank_badge
      expect(screen.getAllByLabelText(/Reordenar capitão/)).toHaveLength(2);

      // 2. Renderização somente leitura (readOnly: true)
      rerender(
        <CaptainsHierarchyCard careerId="c1" season={season} readOnly={true} />,
      );

      expect(screen.queryByLabelText(/Reordenar capitão/)).toBeNull();
    });
  });
});

