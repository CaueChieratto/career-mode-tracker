// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Match } from "../common/interfaces/Match";
import { Players } from "../common/interfaces/playersInfo/players";
import { TransferBonus } from "../common/interfaces/playersInfo/transferTerms";
import { TableRowData } from "../common/interfaces/Table";
import { getAvailableLeagueNamesByNation } from "../common/utils/league";
import {
  evaluateBonus,
  evaluateWageAdjustment,
  findAchievedObjectiveBonusesToSettle,
  findAchievedWageAdjustmentsToApply,
  getStageWeight,
} from "../common/services/ServiceFinance/clauseAutoEvaluator";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { clauseSettlementService } from "../common/services/ServicePlayers/contractServices/clauseSettlementService";
import { playerRenewalService } from "../common/services/ServicePlayers/contractServices/playerRenewalService";
import { objectiveBonusAutoSettlementService } from "../common/services/ServicePlayers/contractServices/objectiveBonusAutoSettlement";
import { ServiceFinance } from "../common/services/ServiceFinance";
import { buildSaleClausesSections } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/constants/buildTransfersFormSections";
import {
  buildRenewalBonusSection,
  buildRenewalSpecialClausesSection,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/RenewPlayer/constants/buildRenewalFormSections";
import { ManageClauses } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses";
import { career, match as matchFactory, player, season } from "./factories/domain";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/Career/c_barca/Season/s1" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "c_barca", seasonId: "s1" }),
  };
});

vi.mock("../contexts/SeasonThemeContext", () => ({
  SeasonThemeContext: React.createContext({
    clubColor: "#a50044",
    darkClubColor: "#004d98",
    activeStyle: {},
    career: {} as Career,
    changeClubColor: vi.fn(),
  }),
  useSeasonTheme: () => ({
    clubColor: "#a50044",
    darkClubColor: "#004d98",
  }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#a50044",
    darkClubColor: "#004d98",
  }),
}));

vi.mock("../components/HeaderSeason", () => ({
  default: ({
    titleText,
    backSeasons,
  }: {
    titleText: string;
    backSeasons: () => void;
  }) => (
    <header data-testid="header-season">
      <h1>{titleText}</h1>
      <button onClick={backSeasons}>Voltar</button>
    </header>
  ),
}));

const buildSpanishLeagueTable = (
  barcaPlayed: number,
  barcaPoints: number,
  secondPoints: number,
  relegation18Points: number,
  barcaPos: "first" | "mid" | "relegation" = "first",
): Array<TableRowData & { league?: string }> => {
  const teams: Array<TableRowData & { league?: string }> = [];
  for (let i = 1; i <= 20; i++) {
    let name = `Clube Espanha ${i}`;
    let points = Math.max(10, 82 - i * 3);
    if (i === 1) {
      name = barcaPos === "first" ? "FC Barcelona" : "Real Madrid";
      points = barcaPos === "first" ? barcaPoints : Math.max(barcaPoints + 5, 90);
    } else if (i === 2) {
      points = secondPoints;
    } else if (i === 10 && barcaPos === "mid") {
      name = "FC Barcelona";
      points = barcaPoints;
    } else if (i === 18) {
      name = barcaPos === "relegation" ? "FC Barcelona" : "Clube Z3 18";
      points = relegation18Points;
    } else if (i > 18) {
      points = Math.max(5, relegation18Points - (i - 18) * 2);
    }

    teams.push({
      id: `team_${i}`,
      position: i,
      name,
      badge: "",
      league: "LaLiga",
      played: barcaPlayed,
      won: Math.floor(points / 3),
      drawn: points % 3,
      lost: Math.max(0, barcaPlayed - Math.floor(points / 3) - (points % 3)),
      goalsFor: 40,
      goalsAgainst: 20,
      goalDiff: 20,
      points,
      zone: "none",
    });
  }
  return teams;
};

describe("Bônus de 'Objetivo atingido' com Liga dedicada e Auto-Liquidação (Padrão FC Barcelona)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("lista todas as ligas disponíveis do país (incluindo continentais) no customSelect de Liga do objetivo", () => {
    const spainLeagues = getAvailableLeagueNamesByNation("Espanha");
    expect(spainLeagues).toEqual(
      expect.arrayContaining([
        "LaLiga",
        "Copa del Rey",
        "Supercopa de España",
        "LaLiga 2",
        "Champions League",
        "Europa League",
        "Conference League",
        "UEFA Super Cup",
      ]),
    );

    const { bonusSection } = buildSaleClausesSections(
      {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: true,
        hasOtherClauses: false,
      },
      { bonusCategory: "Objetivo atingido" },
      undefined,
      [],
      null,
      true,
      [],
      false,
      "Espanha",
      true,
    );

    const flatFields = bonusSection.fields.flat() as Array<{
      id: string;
      inputType?: string;
      options?: readonly string[];
    }>;
    const objectiveIdx = flatFields.findIndex((f) => f.id === "bonusObjective");
    const leagueIdx = flatFields.findIndex((f) => f.id === "bonusLeague");
    const statusField = flatFields.find((f) => f.id === "bonusStatus");

    expect(objectiveIdx).toBeGreaterThan(-1);
    expect(leagueIdx).toBe(objectiveIdx + 1);
    expect(flatFields[leagueIdx].inputType).toBe("custom-select");
    expect(flatFields[leagueIdx].options).toEqual(spainLeagues);
    // No modo ManageClauses (isManageMode=true), status aparece mesmo para Chegadas (isArrivals=true)
    expect(statusField).toBeDefined();
    expect(statusField?.options).toEqual(["Pendente", "Liquidado"]);

    // Em buildRenewalBonusSection também posiciona bonusLeague logo após bonusObjective
    const renewalBonus = buildRenewalBonusSection(
      [],
      null,
      { bonusCategory: "Objetivo atingido" },
      {},
      true,
      "Espanha",
    );
    const renewalFields = renewalBonus.rows.flat();
    const rObjIdx = renewalFields.findIndex((f) => f.id === "bonusObjective");
    const rLeagueIdx = renewalFields.findIndex((f) => f.id === "bonusLeague");
    expect(rLeagueIdx).toBe(rObjIdx + 1);
    expect(renewalFields[rLeagueIdx].inputType).toBe("custom-select");
    expect(renewalFields[rLeagueIdx].options).toEqual(spainLeagues);
  });

  it("não exibe o customSelect de liga quando a categoria for Prêmio ou Desempenho", () => {
    const { bonusSection: awardSection } = buildSaleClausesSections(
      {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: true,
        hasOtherClauses: false,
      },
      { bonusCategory: "Prêmio" },
      undefined,
      [],
      null,
      false,
      [],
      false,
      "Espanha",
      true,
    );

    expect(
      awardSection.fields.flat().some((f) => f.id === "bonusLeague"),
    ).toBe(false);

    const perfRenewal = buildRenewalBonusSection(
      [],
      null,
      { bonusCategory: "Desempenho" },
      {},
      true,
      "Espanha",
    );
    expect(
      perfRenewal.rows.flat().some((f) => f.id === "bonusLeague"),
    ).toBe(false);
  });

  it("reconhece corretamente o peso de 'Chegar aos 16 avos de final' sem confundir com 'Final'", () => {
    expect(getStageWeight("Chegar aos 16 avos de final")).toBe(1);
    expect(getStageWeight("Chegar às oitavas de final")).toBe(2);
    expect(getStageWeight("Chegar às quartas de final")).toBe(3);
    expect(getStageWeight("Chegar às semifinais")).toBe(4);
    expect(getStageWeight("Chegar à final")).toBe(5);
  });

  it("avalia objetivo mata-mata estritamente na liga selecionada via partidas finalizadas", () => {
    const bonus: TransferBonus = {
      id: "bonus_ucl_semi",
      direction: "payable",
      category: "objective",
      bonusCategory: "Objetivo atingido",
      name: "Chegar às semifinais",
      bonusTarget: "Chegar às semifinais",
      targetObjective: "Chegar às semifinais",
      targetLeague: "Champions League",
      value: 5_000_000,
      status: "pending",
    };

    const copaDelReySemi: Match = {
      matchesId: "m_copa_semi",
      date: "15/03",
      league: "Copa del Rey",
      stage: "Semifinal",
      homeTeam: "FC Barcelona",
      awayTeam: "Sevilla",
      homeScore: 2,
      awayScore: 0,
      result: "V",
      status: "FINISHED",
    };

    // Semifinal na Copa del Rey NÃO deve cumprir objetivo da Champions League
    const evalWrongLeague = evaluateBonus(
      bonus,
      "p_pedri",
      [],
      [copaDelReySemi],
      [],
      "FC Barcelona",
    );
    expect(evalWrongLeague.isAchieved).toBe(false);
    expect(evalWrongLeague.isReadyToPay).toBe(false);

    const uclSemi: Match = {
      matchesId: "m_ucl_semi",
      date: "30/04",
      league: "Champions League",
      stage: "Semifinal",
      homeTeam: "FC Barcelona",
      awayTeam: "Inter",
      homeScore: 3,
      awayScore: 1,
      result: "V",
      status: "FINISHED",
    };

    // Semifinal na Champions League DEVE cumprir o objetivo
    const evalRightLeague = evaluateBonus(
      bonus,
      "p_pedri",
      [],
      [copaDelReySemi, uclSemi],
      [],
      "FC Barcelona",
    );
    expect(evalRightLeague.isAchieved).toBe(true);
    expect(evalRightLeague.isReadyToPay).toBe(true);
  });

  it("avalia 'Ser campeão' em copa/continental apenas com vitória na Final da liga selecionada", () => {
    const bonus: TransferBonus = {
      id: "bonus_copa_title",
      direction: "payable",
      category: "objective",
      bonusCategory: "Objetivo atingido",
      name: "Ser campeão",
      bonusTarget: "Ser campeão",
      targetObjective: "Ser campeão",
      targetLeague: "Copa del Rey",
      value: 3_000_000,
      status: "pending",
    };

    const finalLoss: Match = {
      matchesId: "m_copa_final_loss",
      date: "26/04",
      league: "Copa del Rey",
      stage: "Final",
      homeTeam: "FC Barcelona",
      awayTeam: "Real Madrid",
      homeScore: 1,
      awayScore: 2,
      result: "D",
      status: "FINISHED",
    };

    expect(
      evaluateBonus(bonus, "p_gavi", [], [finalLoss], [], "FC Barcelona")
        .isAchieved,
    ).toBe(false);

    const finalWin: Match = {
      ...finalLoss,
      matchesId: "m_copa_final_win",
      homeScore: 3,
      awayScore: 2,
      result: "V",
    };

    expect(
      evaluateBonus(bonus, "p_gavi", [], [finalWin], [], "FC Barcelona")
        .isAchieved,
    ).toBe(true);
  });

  it("avalia objetivos de liga nacional pela tabela (sem liquidar prematuramente na 1ª rodada e liquidando ao confirmar título/encerrar)", () => {
    const titleBonus: TransferBonus = {
      id: "bonus_laliga_title",
      direction: "payable",
      category: "objective",
      bonusCategory: "Objetivo atingido",
      name: "Ser campeão",
      bonusTarget: "Ser campeão",
      targetObjective: "Ser campeão",
      targetLeague: "LaLiga",
      value: 8_000_000,
      status: "pending",
    };

    const seasonLeagues = [
      { name: "LaLiga", logo: "", trophy: "", league: true, isFirstDivision: true },
    ];

    // Rodada 1: Barça em 1º com 3 pontos -> NÃO deve liquidar prematuramente
    const round1Table = buildSpanishLeagueTable(1, 3, 3, 0, "first");
    expect(
      evaluateBonus(
        titleBonus,
        "p_yamal",
        [],
        [],
        round1Table,
        "FC Barcelona",
        seasonLeagues,
      ).isAchieved,
    ).toBe(false);

    // Rodada 35: Barça com 92 pts e 2º com 80 pts (restam 3 jogos = máx 89) -> Título matemático!
    const clinchedTable = buildSpanishLeagueTable(35, 92, 80, 30, "first");
    expect(
      evaluateBonus(
        titleBonus,
        "p_yamal",
        [],
        [],
        clinchedTable,
        "FC Barcelona",
        seasonLeagues,
      ).isAchieved,
    ).toBe(true);

    // Objetivo de LaLiga 2 NÃO deve disparar usando a tabela da LaLiga
    const laliga2Bonus: TransferBonus = {
      ...titleBonus,
      id: "bonus_laliga2",
      targetLeague: "LaLiga 2",
    };
    expect(
      evaluateBonus(
        laliga2Bonus,
        "p_yamal",
        [],
        [],
        clinchedTable,
        "FC Barcelona",
        seasonLeagues,
      ).isAchieved,
    ).toBe(false);
  });

  it("auto-liquida bônus cumprido de Cláusulas do Clube e respeita autoSettlementDisabled quando o usuário reverte manualmente para Pendente", async () => {
    const settleSpy = vi
      .spyOn(clauseSettlementService, "settleBonus")
      .mockResolvedValue(undefined);

    const olmo = player({
      id: "p_olmo_club_bonus",
      name: "Dani Olmo",
      buy: true,
      contract: [
        {
          fromClub: "RB Leipzig",
          leftClub: "",
          buyValue: 55_000_000,
          sellValue: 0,
          dataArrival: new Date("2026-08-09"),
          salary: 180_000,
          contractTime: 5,
          bonuses: [
            {
              id: "b_ucl_final",
              direction: "payable",
              category: "objective",
              bonusCategory: "Objetivo atingido",
              name: "Chegar à final",
              bonusTarget: "Chegar à final",
              targetObjective: "Chegar à final",
              targetLeague: "Champions League",
              partnerClub: "RB Leipzig",
              bonusOrigin: "club",
              value: 4_000_000,
              status: "pending",
              paid: false,
            },
          ],
        },
      ],
    });

    const uclFinal: Match = {
      matchesId: "m_ucl_final",
      date: "31/05",
      league: "Champions League",
      stage: "Final",
      homeTeam: "FC Barcelona",
      awayTeam: "Arsenal",
      homeScore: 2,
      awayScore: 1,
      result: "V",
      status: "FINISHED",
    };

    const barcaSeason: ClubData = season({
      id: "s1",
      seasonNumber: 1,
      players: [olmo],
      matches: [uclFinal],
      leagues: [
        { name: "LaLiga", logo: "", trophy: "", league: true, isFirstDivision: true },
        { name: "Champions League", logo: "", trophy: "" },
      ],
    });
    const barcaCareer: Career = career({
      id: "c_barca",
      clubName: "FC Barcelona",
      nation: "Espanha",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      clubData: [barcaSeason],
    });

    const candidatesBefore = findAchievedObjectiveBonusesToSettle(
      barcaCareer,
      barcaSeason,
    );
    expect(candidatesBefore).toHaveLength(1);
    expect(candidatesBefore[0].bonus.id).toBe("b_ucl_final");

    const result = await PlayersContractService.autoSettleAchievedObjectiveBonuses(
      barcaCareer.id,
      barcaSeason.id,
      barcaCareer,
      barcaSeason,
    );

    expect(result.settledCount).toBe(1);
    expect(settleSpy).toHaveBeenCalledWith(
      "c_barca",
      "s1",
      "p_olmo_club_bonus",
      "b_ucl_final",
      0,
      false,
      true,
    );
    expect(olmo.contract[0].bonuses?.[0].status).toBe("paid");
    expect(olmo.contract[0].bonuses?.[0].paid).toBe(true);

    // Simula o usuário revertendo o status para Pendente com autoSettlementDisabled=true
    olmo.contract[0].bonuses![0] = {
      ...olmo.contract[0].bonuses![0],
      status: "pending",
      paid: false,
      autoSettlementDisabled: true,
    };

    const candidatesAfterManualRevert = findAchievedObjectiveBonusesToSettle(
      barcaCareer,
      barcaSeason,
    );
    expect(candidatesAfterManualRevert).toHaveLength(0);
  });

  it("NUNCA liquida automaticamente bônus e metas de Termos do Atleta (renovação, contractDetails ou bonusOrigin='player'), mantendo status='pending' até liquidação manual", async () => {
    const settleSpy = vi
      .spyOn(clauseSettlementService, "settleBonus")
      .mockResolvedValue(undefined);

    const yamalRenewal = player({
      id: "p_yamal_terms",
      name: "Lamine Yamal",
      contractDetails: {
        weeklyWage: 300_000,
        durationYears: 5,
        performanceBonuses: [
          {
            id: "b_yamal_player_details",
            direction: "payable",
            category: "objective",
            bonusCategory: "Objetivo atingido",
            name: "Ser campeão",
            bonusTarget: "Ser campeão",
            targetObjective: "Ser campeão",
            targetLeague: "LaLiga",
            value: 3_000_000,
            status: "pending",
            paid: false,
            bonusOrigin: "player",
          },
        ],
      },
      contract: [
        {
          fromClub: "",
          leftClub: "",
          buyValue: 0,
          sellValue: 0,
          dataArrival: new Date("2026-07-01"),
          isRenewal: true,
          salary: 300_000,
          contractTime: 5,
          bonuses: [
            {
              id: "b_yamal_renewal_laliga",
              direction: "payable",
              category: "objective",
              bonusCategory: "Objetivo atingido",
              name: "Ser campeão",
              bonusTarget: "Ser campeão",
              targetObjective: "Ser campeão",
              targetLeague: "LaLiga",
              value: 4_000_000,
              status: "pending",
              paid: false,
            },
          ],
          contractDetails: {
            weeklyWage: 300_000,
            durationYears: 5,
            isRenewal: true,
            performanceBonuses: [
              {
                id: "b_yamal_contract_details",
                direction: "payable",
                category: "objective",
                bonusCategory: "Objetivo atingido",
                name: "Chegar à final",
                bonusTarget: "Chegar à final",
                targetObjective: "Chegar à final",
                targetLeague: "Champions League",
                value: 2_500_000,
                status: "pending",
                paid: false,
              },
            ],
          },
        },
      ],
    });

    const pedriArrivalPlayerTerms = player({
      id: "p_pedri_terms",
      name: "Pedri González",
      buy: true,
      contract: [
        {
          fromClub: "UD Las Palmas",
          leftClub: "",
          buyValue: 20_000_000,
          sellValue: 0,
          dataArrival: new Date("2026-07-05"),
          bonuses: [
            {
              id: "b_pedri_player_origin",
              direction: "payable",
              category: "objective",
              bonusCategory: "Objetivo atingido",
              name: "Ser campeão",
              bonusTarget: "Ser campeão",
              targetObjective: "Ser campeão",
              targetLeague: "LaLiga",
              value: 2_000_000,
              status: "pending",
              paid: false,
              bonusOrigin: "player",
            },
          ],
        },
      ],
    });

    const tableLaLiga = buildSpanishLeagueTable(38, 92, 85, 35, "first");
    const uclFinal: Match = {
      matchesId: "m_ucl_final",
      date: "31/05",
      league: "Champions League",
      stage: "Final",
      homeTeam: "FC Barcelona",
      awayTeam: "Arsenal",
      homeScore: 2,
      awayScore: 1,
      result: "V",
      status: "FINISHED",
    };

    const barcaSeason: ClubData = season({
      id: "s1",
      seasonNumber: 1,
      players: [yamalRenewal, pedriArrivalPlayerTerms],
      table: tableLaLiga,
      matches: [uclFinal],
      leagues: [
        { name: "LaLiga", logo: "", trophy: "", league: true, isFirstDivision: true },
        { name: "Champions League", logo: "", trophy: "" },
      ],
    });
    const barcaCareer: Career = career({
      id: "c_barca",
      clubName: "FC Barcelona",
      nation: "Espanha",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      clubData: [barcaSeason],
    });

    const candidates = findAchievedObjectiveBonusesToSettle(
      barcaCareer,
      barcaSeason,
    );
    expect(candidates).toHaveLength(0);

    const result = await PlayersContractService.autoSettleAchievedObjectiveBonuses(
      barcaCareer.id,
      barcaSeason.id,
      barcaCareer,
      barcaSeason,
    );
    expect(result.settledCount).toBe(0);
    expect(settleSpy).not.toHaveBeenCalled();
    expect(yamalRenewal.contract[0].bonuses?.[0].status).toBe("pending");
    expect(
      yamalRenewal.contract[0].contractDetails?.performanceBonuses?.[0].status,
    ).toBe("pending");
    expect(yamalRenewal.contractDetails?.performanceBonuses?.[0].status).toBe(
      "pending",
    );
    expect(pedriArrivalPlayerTerms.contract[0].bonuses?.[0].status).toBe(
      "pending",
    );
  });

  it("permite alterar status de bônus de Liquidado para Pendente no menu lateral ao editar Cláusulas do Clube de uma Chegada", async () => {
    const editTransferSpy = vi
      .spyOn(PlayersContractService, "editTransferInSeason")
      .mockResolvedValue(undefined);
    const deleteFinanceSpy = vi
      .spyOn(ServiceFinance, "deleteEntry")
      .mockResolvedValue(undefined);

    const olmo: Players = player({
      id: "p_olmo",
      name: "Dani Olmo",
      buy: true,
      contract: [
        {
          fromClub: "RB Leipzig",
          leftClub: "",
          buyValue: 55_000_000,
          sellValue: 0,
          dataArrival: new Date("2026-08-09"),
          salary: 180_000,
          contractTime: 5,
          bonuses: [
            {
              id: "bonus_olmo_laliga",
              direction: "payable",
              category: "objective",
              bonusCategory: "Objetivo atingido",
              name: "Ser campeão",
              bonusTarget: "Ser campeão",
              targetObjective: "Ser campeão",
              targetLeague: "LaLiga",
              partnerClub: "RB Leipzig",
              value: 5_000_000,
              status: "paid",
              paid: true,
              autoEvaluated: true,
            },
          ],
        },
      ],
    });

    const barcaSeason: ClubData = season({
      id: "s1",
      seasonNumber: 1,
      players: [olmo],
    });
    const barcaCareer: Career = career({
      id: "c_barca",
      clubName: "FC Barcelona",
      nation: "Espanha",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      clubData: [barcaSeason],
    });

    render(
      <ManageClauses
        career={barcaCareer}
        season={barcaSeason}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    // Clica em Editar no card de Chegada e escolhe Cláusulas do Clube
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));
    fireEvent.click(screen.getByTestId("btn-choose-club-clauses"));

    // Abre a gaveta lateral de Bônus & Metas (Clube Vendedor)
    fireEvent.click(
      screen.getByRole("button", { name: /Adicionar \/ Editar Bônus/i }),
    );

    // Exibe a liga no card do bônus e o status Liquidado
    expect(screen.getByText(/Liga: LaLiga/i)).toBeTruthy();
    expect(screen.getByText(/Status: Liquidado/i)).toBeTruthy();

    // Clica no lápis de editar o bônus
    fireEvent.click(screen.getByTitle("Editar bônus"));

    // O campo Status do bônus DEVE aparecer no menu lateral para Chegadas (Cláusulas do Clube)
    const comboboxes = screen.getAllByRole("combobox");
    const bonusStatusCombobox = comboboxes[comboboxes.length - 1];
    fireEvent.mouseDown(bonusStatusCombobox);

    const pendingOption = screen.getByRole("option", { name: "Pendente" });
    fireEvent.mouseDown(pendingOption);

    // Salva alterações do bônus, conclui drawer e salva cláusulas
    fireEvent.click(screen.getByRole("button", { name: "Salvar Alterações" }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir" }));
    fireEvent.click(screen.getByText("Salvar Cláusulas"));

    await waitFor(() => {
      expect(editTransferSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          bonuses: [
            expect.objectContaining({
              id: "bonus_olmo_laliga",
              targetLeague: "LaLiga",
              status: "pending",
              paid: false,
              autoSettlementDisabled: true,
            }),
          ],
        }),
      );
      expect(deleteFinanceSpy).toHaveBeenCalledWith(
        "c_barca",
        "s1",
        "bonus_bonus_olmo_laliga",
      );
    });
  });

  it("renderiza o seletor de liga (wageAdjustmentLeague) ao configurar Critério de ajuste em buildRenewalSpecialClausesSection", () => {
    const section = buildRenewalSpecialClausesSection(
      {
        wageAdjustmentType: "Aumentar",
        wageAdjustmentObjective: "Ser campeão",
        wageAdjustmentLeague: "LaLiga",
      },
      {},
      false,
      "Espanha",
    );

    // Linha 0: Multa rescisória
    expect(section.rows[0][0].id).toBe("releaseClause");
    // Linha 1: Tipo de ajuste
    expect(section.rows[1][0].id).toBe("wageAdjustmentType");
    // Linha 2: Critério de ajuste + Competição / Liga
    expect(section.rows[2][0].id).toBe("wageAdjustmentObjective");
    expect(section.rows[2][1].id).toBe("wageAdjustmentLeague");
    expect(section.rows[2][1].name).toBe("Competição / Liga");

    const leagueOptions = (section.rows[2][1] as { options?: readonly string[] })
      .options || [];
    expect(leagueOptions).toContain("LaLiga");
    expect(leagueOptions).toContain("LaLiga 2");
    expect(leagueOptions).toContain("Copa del Rey");
    expect(leagueOptions).toContain("Champions League");

    // Linha 3: Porcentagem de ajuste
    expect(section.rows[3][0].id).toBe("wageAdjustmentPercentage");
  });

  it("evaluateWageAdjustment avalia meta esportiva na liga específica informada (LaLiga vs Copa del Rey)", () => {
    const tableLaLiga = buildSpanishLeagueTable(38, 92, 85, 35, "first");
    const cupMatches: Match[] = [
      matchFactory({
        matchesId: "m_cdr_final",
        homeTeam: "FC Barcelona",
        awayTeam: "Real Madrid",
        homeScore: 3,
        awayScore: 1,
        stage: "Final",
        league: "Copa del Rey",
        status: "FINISHED",
        result: "V",
      }),
    ];

    // Contrato com meta de Ser campeão na LaLiga
    const contractLaLiga = {
      weeklyWage: 200_000,
      durationYears: 4,
      wageAdjustment: {
        enabled: true,
        percentage: 15,
        targetObjective: "Ser campeão",
        targetLeague: "LaLiga",
        direction: "Aumentar" as const,
      },
    };

    const resLaLiga = evaluateWageAdjustment(
      contractLaLiga,
      tableLaLiga,
      cupMatches,
      "FC Barcelona",
    );
    expect(resLaLiga.applied).toBe(true);
    expect(resLaLiga.outcome).toBe("increased");
    expect(resLaLiga.adjustedWage).toBe(230_000); // 200k + 15% (30k)

    // Contrato com meta de Ser campeão na Champions League (não disputada)
    const contractUCL = {
      weeklyWage: 200_000,
      durationYears: 4,
      wageAdjustment: {
        enabled: true,
        percentage: 15,
        targetObjective: "Ser campeão",
        targetLeague: "Champions League",
        direction: "Aumentar" as const,
      },
    };

    const resUCL = evaluateWageAdjustment(
      contractUCL,
      tableLaLiga,
      cupMatches,
      "FC Barcelona",
    );
    // Champions League não tem jogos nem tabela, permanece pending
    expect(resUCL.applied).toBe(false);
    expect(resUCL.outcome).toBe("pending");

    // Contrato com meta de Chegar à final na Copa del Rey
    const contractCdr = {
      weeklyWage: 150_000,
      durationYears: 3,
      wageAdjustment: {
        enabled: true,
        percentage: 10,
        targetObjective: "Chegar à final",
        targetLeague: "Copa del Rey",
        direction: "Aumentar" as const,
      },
    };
    const resCdr = evaluateWageAdjustment(
      contractCdr,
      tableLaLiga,
      cupMatches,
      "FC Barcelona",
    );
    expect(resCdr.applied).toBe(true);
    expect(resCdr.outcome).toBe("increased");
    expect(resCdr.adjustedWage).toBe(165_000);
  });

  it("findAchievedWageAdjustmentsToApply encontra candidatos de reajuste e auto-aplica via objectiveBonusAutoSettlementService", async () => {
    const applyWageSpy = vi
      .spyOn(playerRenewalService, "applyRenewalWageAdjustment")
      .mockResolvedValue(230_000);

    const pedri: Players = player({
      id: "p_pedri",
      name: "Pedri González",
      contract: [
        {
          fromClub: "Base",
          leftClub: "",
          buyValue: 0,
          sellValue: 0,
          dataArrival: new Date("2026-07-01"),
          salary: 200_000,
          contractTime: 4,
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              targetObjective: "Ser campeão",
              targetLeague: "LaLiga",
              percentage: 15,
              direction: "Aumentar",
              status: "pending",
              applied: false,
            },
          },
        },
      ],
    });

    const tableLaLiga = buildSpanishLeagueTable(38, 92, 85, 35, "first");
    const barcaSeason: ClubData = season({
      id: "s1",
      seasonNumber: 1,
      players: [pedri],
      table: tableLaLiga,
      matches: [],
    });
    const barcaCareer: Career = career({
      id: "c_barca",
      clubName: "FC Barcelona",
      nation: "Espanha",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      clubData: [barcaSeason],
    });

    const candidates = findAchievedWageAdjustmentsToApply(barcaCareer, barcaSeason);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].playerName).toBe("Pedri González");
    expect(candidates[0].targetLeague).toBe("LaLiga");

    // Executa o auto-settlement da rodada
    await objectiveBonusAutoSettlementService.autoSettleAchievedObjectiveBonuses(
      "c_barca",
      "s1",
      barcaCareer,
      barcaSeason,
    );

    expect(applyWageSpy).toHaveBeenCalledWith("c_barca", "s1", "p_pedri", 0);

    // Se o usuário desativou a liquidação automática (autoSettlementDisabled = true), não aplica
    applyWageSpy.mockClear();
    pedri.contract[0].contractClauses!.wageAdjustment!.autoSettlementDisabled = true;

    const disabledCandidates = findAchievedWageAdjustmentsToApply(
      barcaCareer,
      barcaSeason,
    );
    expect(disabledCandidates).toHaveLength(0);
  });
});
