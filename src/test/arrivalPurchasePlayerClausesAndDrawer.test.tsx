// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import {
  resolveContractPlayerClauses,
  splitClubAndPlayerBonuses,
} from "../common/helpers/contractPlayerClauses";
import { hasArrivalActiveClauses } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/helpers/arrivalTransferFilter";
import { TransferClauseCard } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/TransferClauseCard";
import { ClauseSectionDrawer } from "../components/ClauseSectionDrawer";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { Players } from "../common/interfaces/playersInfo/players";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { TransferBonus } from "../common/interfaces/playersInfo/transferTerms";

// Mock dependencies
vi.mock("../common/services/Firebase", () => ({
  auth: { currentUser: { uid: "user_barca_123" } },
  db: {},
}));

const emptyToasts: unknown[] = [];
vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  toastStore: {
    subscribe: vi.fn(() => vi.fn()),
    getSnapshot: vi.fn(() => emptyToasts),
  },
  useToast: () => ({
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#004d98",
    activeStyle: {
      color: "#ffffff",
      darkClubColor: "#a50044",
      backgroundColor: "#004d98",
      primaryColor: "#004d98",
    },
  }),
}));

const createMockContract = (overrides: Partial<Contract> = {}): Contract => ({
  buyValue: 0,
  sellValue: 0,
  fromClub: "RB Leipzig",
  leftClub: "",
  dataArrival: new Date("2024-07-01"),
  ...overrides,
});

describe("Frente 7: Cláusulas do Atleta em Compras (arrivals) e Drawer Blindado (Padrão FC Barcelona)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockCareer: Career = {
    id: "c_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "https://example.com/barca.png",
    currency: "EUR",
    nation: "ESP",
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    createdAt: new Date("2024-07-01"),
    updatedAt: Date.now(),
    clubData: [],
  };

  const mockSeason: ClubData = {
    id: "s_2024_2025",
    seasonNumber: 1,
    players: [],
    matches: [],
  };

  const daniOlmo: Players = {
    id: "p_dani_olmo",
    name: "Dani Olmo",
    position: "MEI",
    sector: "Meio-Campo",
    age: 26,
    nation: "ESP",
    overall: 86,
    shirtNumber: "20",
    ballonDor: 0,
    buy: false,
    captain: false,
    sell: false,
    contract: [],
    statsLeagues: [],
  };

  describe("resolveContractPlayerClauses e splitClubAndPlayerBonuses", () => {
    it("deve resolver multa rescisória, ajuste salarial e bônus do atleta a partir de contractClauses e contractDetails", () => {
      const bonuses: TransferBonus[] = [
        {
          id: "b_club_1",
          direction: "payable",
          category: "performance",
          name: "15 Gols",
          value: 2000000,
          status: "pending",
        },
        {
          id: "b_player_1",
          direction: "payable",
          category: "performance",
          name: "30 Partidas",
          value: 1000000,
          status: "pending",
        },
      ];

      const contract = createMockContract({
        fromClub: "RB Leipzig",
        isLoan: false,
        buyValue: 55000000,
        contractClauses: {
          releaseClause: 500000000,
          wageAdjustment: {
            targetObjective: "25 partidas",
            percentage: 20,
            applied: false,
          },
        },
        bonuses,
      });

      const resolved = resolveContractPlayerClauses(contract);
      expect(resolved.releaseClause).toBe(500000000);
      expect(resolved.wageAdjustment?.percentage).toBe(20);
      expect(resolved.wageAdjustment?.targetObjective).toBe("25 partidas");
      expect(resolved.hasAnyPlayerClauses).toBe(true);
      expect(resolved.allBonuses.length).toBe(2);

      const split = splitClubAndPlayerBonuses(contract.bonuses || []);
      expect(split.clubBonuses.length).toBe(2);
    });

    it("hasArrivalActiveClauses deve retornar true para compra que possua cláusulas de atleta", () => {
      const contractWithRelease = createMockContract({
        fromClub: "RB Leipzig",
        isLoan: false,
        buyValue: 55000000,
        contractClauses: {
          releaseClause: 500000000,
        },
      });

      expect(hasArrivalActiveClauses(contractWithRelease)).toBe(true);

      const contractWithWageAdj = createMockContract({
        fromClub: "RB Leipzig",
        isLoan: false,
        buyValue: 55000000,
        contractDetails: {
          weeklyWage: 150000,
          durationYears: 5,
          wageAdjustment: {
            targetObjective: "20 partidas",
            percentage: 15,
            applied: false,
          },
        },
      });

      expect(hasArrivalActiveClauses(contractWithWageAdj)).toBe(true);
    });
  });

  describe("TransferClauseCard com Cláusulas do Atleta em Compras", () => {
    it("deve renderizar multa rescisória e ajuste salarial no card e habilitar o botão Gerenciar", () => {
      const contract = createMockContract({
        fromClub: "RB Leipzig",
        isLoan: false,
        buyValue: 55000000,
        contractClauses: {
          releaseClause: 500000000,
          wageAdjustment: {
            targetObjective: "20 partidas",
            percentage: 15,
            applied: false,
          },
        },
      });

      const startManageCard = vi.fn();

      render(
        <TransferClauseCard
          item={{
            contract,
            player: daniOlmo,
            direction: "arrivals",
            contractIndex: 0,
          }}
          isDetailView={false}
          career={mockCareer}
          season={mockSeason}
          clubColor="#004d98"
          readOnly={false}
          activeInline={null}
          highlightedCardKey={null}
          getClubBadgeUrl={() => undefined}
          startEditCard={vi.fn()}
          startManageCard={startManageCard}
          cancelInline={vi.fn()}
          handleDeleteRenewal={vi.fn()}
          handleRevertTransfer={vi.fn()}
          onOpenScreen={vi.fn()}
        />,
      );

      const manageBtn = screen.getByTestId("btn-manage-clauses");
      expect(manageBtn).not.toBeNull();

      fireEvent.click(manageBtn);
      expect(startManageCard).toHaveBeenCalled();

      expect(screen.getAllByText(/Multa/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Ajuste salarial/i).length).toBeGreaterThan(0);
    });
  });

  describe("ClauseSectionDrawer - Encapsulamento com portal e drawerBody", () => {
    it("deve renderizar o conteúdo do drawer com sucesso via Portal no document.body", () => {
      render(
        <ClauseSectionDrawer
          isOpen={true}
          title="Multa Rescisória do Atleta"
          onClose={vi.fn()}
          onSave={vi.fn()}
        >
          <div className="drawerContent" data-testid="drawer-child-content">
            <input type="text" defaultValue="500M" />
          </div>
        </ClauseSectionDrawer>,
      );

      const drawerOverlay = document.body.querySelector(
        "[data-testid='clause-section-drawer-overlay']",
      );
      expect(drawerOverlay).not.toBeNull();

      const drawerBody = document.body.querySelector("#clauseSectionDrawerBody");
      expect(drawerBody).not.toBeNull();
      expect(screen.getByTestId("drawer-child-content")).not.toBeNull();
    });
  });
});
