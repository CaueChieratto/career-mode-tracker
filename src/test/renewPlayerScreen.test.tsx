// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { RenewPlayer } from "../layout/SectionView/features/ClubTabs/SquadTab/views/RenewPlayer";
import {
  buildRenewalBonusSection,
  buildRenewalSpecialClausesSection,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/RenewPlayer/constants/buildRenewalFormSections";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { ServiceProposals } from "../common/services/ServiceProposals";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/Career/c1/Season/s1" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "c1", seasonId: "s1" }),
  };
});

vi.mock("../common/hooks/Colors/UseClubColors", () => ({
  useClubColors: () => ({ clubColor: "#10b981", darkClubColor: "#047857" }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#10b981",
    darkClubColor: "#047857",
  }),
}));

vi.mock("../common/services/ColorsService", () => ({
  ColorsService: {
    getColorSaved: () => "#10b981",
  },
}));

vi.mock("../common/services/ServicePlayers/PlayersContractService", () => ({
  PlayersContractService: {
    createPlayerRenewal: vi.fn().mockResolvedValue({
      id: "p1",
      name: "Gabriel Barbosa",
      salary: 300000,
      contractUntil: "31/12/2028",
      contractTime: 4,
    }),
  },
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    createProposal: vi.fn().mockImplementation(async (_careerId, _seasonId, payload) => ({
      ...payload,
      id: "prop_renewal_1",
    })),
    updateProposal: vi.fn().mockResolvedValue(undefined),
    getProposalById: vi.fn().mockResolvedValue(null),
  },
}));

const mockCareer: Career = {
  id: "c1",
  clubName: "Flamengo",
  managerName: "Tite",
  createdAt: new Date("2024-01-01"),
  teamBadge: "badge.png",
  nation: "Brazil",
  currency: "R$",
  colorsTeams: ["#c00", "#000"],
  trophies: [],
  clubData: [],
};

const mockSeason: ClubData = {
  id: "s1",
  seasonNumber: 1,
  players: [
    {
      id: "p1",
      name: "Gabriel Barbosa",
      position: "ATA",
      age: 27,
      overall: 80,
      salary: 200000,
      contractUntil: "31/12/2024",
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "Santos",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          salary: 200000,
          contractUntil: "31/12/2024",
        },
      ],
    } as unknown as Players,
  ],
  matches: [],
  table: [],
};

describe("RenewPlayer View - Fluxo de Renovação de Contrato", () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.mocked(ServiceProposals.createProposal).mockImplementation(
      async (_careerId, _seasonId, payload) => ({
        ...payload,
        id: "prop_renewal_1",
      }),
    );
    vi.mocked(PlayersContractService.createPlayerRenewal).mockResolvedValue({
      id: "p1",
      name: "Gabriel Barbosa",
      salary: 300000,
      contractUntil: "31/12/2028",
      contractTime: 4,
    } as unknown as Players);
  });

  it("renderiza a Seção 1 (Informações do Contrato) com campos zerados e sem a seção de cláusulas adicionais", () => {
    render(
      <RenewPlayer
        career={mockCareer}
        season={mockSeason}
        playerId="p1"
        onClose={vi.fn()}
      />,
    );

    // Seção 1: Informações do Contrato
    expect(screen.getByText("Informações do Contrato")).not.toBeNull();
    const salaryInput = screen.getByPlaceholderText("Ex: 500k, 1.2M") as HTMLInputElement;
    const extensionInput = screen.getByPlaceholderText("Ex: 1, 2, 3 anos") as HTMLInputElement;
    const signingBonusInput = screen.getByPlaceholderText("Ex: 5M, 500k") as HTMLInputElement;

    expect(salaryInput).not.toBeNull();
    expect(extensionInput).not.toBeNull();
    expect(signingBonusInput).not.toBeNull();

    // Rótulo deve se chamar 'Extensão de contrato'
    expect(screen.getByText("Extensão de contrato")).not.toBeNull();

    // Estado inicial é 100% limpo / zerado para uma nova renovação
    expect(salaryInput.value).toBe("");
    expect(extensionInput.value).toBe("");
    expect(signingBonusInput.value).toBe("");

    // Seção Cláusulas Adicionais foi removida da tela de renovar
    expect(screen.queryByText("Cláusulas Adicionais")).toBeNull();
    expect(screen.queryByText(/Bônus & Metas/i)).toBeNull();
    expect(screen.queryByText(/Cláusulas Especiais/i)).toBeNull();
    expect(screen.queryByText(/Parcelamento/i)).toBeNull();
    expect(screen.queryByText(/Troca/i)).toBeNull();
  });

  it("soma a extensão de contrato ao contrato original do atleta (2 anos + 1 ano extensão = 3 anos)", async () => {
    const handleClose = vi.fn();
    const handleOpenScreen = vi.fn();

    const seasonWith2YearsContract: ClubData = {
      ...mockSeason,
      players: [
        {
          id: "p_pedri",
          name: "Pedri",
          position: "MC",
          age: 21,
          overall: 86,
          salary: 150000,
          contractTime: 2,
          contractUntil: "31/12/2026",
          contract: [],
        } as unknown as Players,
      ],
    };

    render(
      <RenewPlayer
        career={mockCareer}
        season={seasonWith2YearsContract}
        playerId="p_pedri"
        onClose={handleClose}
        onOpenScreen={handleOpenScreen}
      />,
    );

    const salaryInput = screen.getByPlaceholderText("Ex: 500k, 1.2M");
    const extensionInput = screen.getByPlaceholderText("Ex: 1, 2, 3 anos");

    fireEvent.change(salaryInput, { target: { value: "350k" } });
    fireEvent.change(extensionInput, { target: { value: "1" } });

    const saveBtn = screen.getByText("Enviar Proposta");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(ServiceProposals.createProposal).toHaveBeenCalledWith(
        "c1",
        "s1",
        expect.objectContaining({
          playerId: "p_pedri",
          playerNegotiation: expect.objectContaining({
            weeklyWage: 350000,
            durationYears: 3, // 2 anos originais + 1 ano extensão = 3 anos
          }),
        }),
      );
    });
  });

  it("soma 0 anos de extensão ao contrato original sem regredir (2 anos + 0 anos extensão = 2 anos)", async () => {
    const handleClose = vi.fn();
    const handleOpenScreen = vi.fn();

    const seasonWith2YearsContract: ClubData = {
      ...mockSeason,
      players: [
        {
          id: "p_pedri",
          name: "Pedri",
          position: "MC",
          age: 21,
          overall: 86,
          salary: 150000,
          contractTime: 2,
          contractUntil: "31/12/2026",
          contract: [],
        } as unknown as Players,
      ],
    };

    render(
      <RenewPlayer
        career={mockCareer}
        season={seasonWith2YearsContract}
        playerId="p_pedri"
        onClose={handleClose}
        onOpenScreen={handleOpenScreen}
      />,
    );

    const salaryInput = screen.getByPlaceholderText("Ex: 500k, 1.2M");
    const extensionInput = screen.getByPlaceholderText("Ex: 1, 2, 3 anos");

    fireEvent.change(salaryInput, { target: { value: "350k" } });
    fireEvent.change(extensionInput, { target: { value: "0" } });

    const saveBtn = screen.getByText("Enviar Proposta");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(ServiceProposals.createProposal).toHaveBeenCalledWith(
        "c1",
        "s1",
        expect.objectContaining({
          playerId: "p_pedri",
          playerNegotiation: expect.objectContaining({
            weeklyWage: 350000,
            durationYears: 2, // 2 anos originais + 0 anos extensão = 2 anos (NÃO regride para 1)
          }),
        }),
      );
    });
  });

  it("salva renovação com sucesso ao preencher formulário e aciona onOpenScreen para manageClauses", async () => {
    const handleClose = vi.fn();
    const handleOpenScreen = vi.fn();

    render(
      <RenewPlayer
        career={mockCareer}
        season={mockSeason}
        playerId="p1"
        onClose={handleClose}
        onOpenScreen={handleOpenScreen}
      />,
    );

    // Preenche Seção 1
    const salaryInput = screen.getByPlaceholderText("Ex: 500k, 1.2M");
    const durationInput = screen.getByPlaceholderText("Ex: 1, 2, 3 anos");
    const signingBonusInput = screen.getByPlaceholderText("Ex: 5M, 500k");

    fireEvent.change(salaryInput, { target: { value: "300k" } });
    fireEvent.change(durationInput, { target: { value: "4" } });
    fireEvent.change(signingBonusInput, { target: { value: "1M" } });

    // Clica em Enviar Proposta na navbar
    const saveBtn = screen.getByText("Enviar Proposta");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(ServiceProposals.createProposal).toHaveBeenCalledWith(
        "c1",
        "s1",
        expect.objectContaining({
          careerId: "c1",
          seasonId: "s1",
          type: "renovacao",
          playerId: "p1",
          playerNegotiation: expect.objectContaining({
            weeklyWage: 300000,
            durationYears: 4,
            signingBonus: 1000000,
          }),
        }),
      );
      expect(handleClose).toHaveBeenCalled();
      expect(handleOpenScreen).toHaveBeenCalledWith({
        key: "manageClauses",
        initialTab: "renewals",
        selectedPlayerName: "Gabriel Barbosa",
        selectedProposalId: "prop_renewal_1",
      });
    });
  });

  it("não renderiza botões ou drawers de Bônus & Metas e Cláusulas Especiais na tela de renovação", () => {
    render(
      <RenewPlayer
        career={mockCareer}
        season={mockSeason}
        playerId="p1"
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText("Adicionar / Editar Bônus")).toBeNull();
    expect(screen.queryByText("Ajustar Acordos Especiais")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("limpa o rascunho do sessionStorage ao clicar no botão voltar do header", () => {
    sessionStorage.setItem("renewal_draft_c1_s1_p1", JSON.stringify({ bonuses: [] }));
    const handleClose = vi.fn();

    render(
      <RenewPlayer
        career={mockCareer}
        season={mockSeason}
        playerId="p1"
        onClose={handleClose}
      />,
    );

    // Clica no botão voltar do HeaderSeason
    const backBtn = screen.getByRole("button", { name: "Voltar" });
    fireEvent.click(backBtn);

    expect(handleClose).toHaveBeenCalled();
    expect(sessionStorage.getItem("renewal_draft_c1_s1_p1")).toBeNull();
  });

  it("possui placeholder 'Selecione o tipo de bônus' no campo bonusCategory em buildRenewalBonusSection", () => {
    const section = buildRenewalBonusSection([], null, {} as unknown as import("../layout/SectionView/features/ClubTabs/SquadTab/views/RenewPlayer/types").RenewalFormValues);
    const bonusCategoryField = section.rows[0][0];
    expect(bonusCategoryField.id).toBe("bonusCategory");
    expect(bonusCategoryField.placeholder).toBe("Selecione o tipo de bônus");
  });

  it("exibe componente de Load durante o salvamento da renovação contratual", async () => {
    let resolveSave: ((val: TransferProposal) => void) | null = null;
    vi.mocked(ServiceProposals.createProposal).mockImplementationOnce(
      () =>
        new Promise<TransferProposal>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(
      <RenewPlayer
        career={mockCareer}
        season={mockSeason}
        playerId="p1"
        onClose={vi.fn()}
      />,
    );

    const salaryInput = screen.getByPlaceholderText("Ex: 500k, 1.2M");
    const durationInput = screen.getByPlaceholderText("Ex: 1, 2, 3 anos");
    fireEvent.change(salaryInput, { target: { value: "300k" } });
    fireEvent.change(durationInput, { target: { value: "4" } });

    const saveBtn = screen.getByText("Enviar Proposta");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      const loadElement = document.querySelector('[class*="containerLoadTransfers"]');
      expect(loadElement).not.toBeNull();
    });

    resolveSave!({
      id: "prop_renewal_1",
      careerId: "c1",
      seasonId: "s1",
      type: "renovacao",
      playerId: "p1",
      playerName: "Gabriel Barbosa",
      overallStatus: "em_andamento",
    } as TransferProposal);

    await waitFor(() => {
      const loadElement = document.querySelector('[class*="containerLoadTransfers"]');
      expect(loadElement).toBeNull();
    });
  });

  it("define placeholders adequados para os campos de custom-select nas cláusulas especiais e bônus", () => {
    const specialSections = buildRenewalSpecialClausesSection({
      wageAdjustmentType: "Aumentar",
    } as unknown as Parameters<typeof buildRenewalSpecialClausesSection>[0]);
    const wageTypeField = specialSections.rows[1][0];
    expect(wageTypeField.placeholder).toBe("Selecione o ajuste");

    const wageLeagueField = specialSections.rows[2][1];
    expect(wageLeagueField.placeholder).toBe("Selecione a liga");

    const wagePctField = specialSections.rows[3][0];
    expect(wagePctField.placeholder).toBe("Selecione a %");

    const bonusSection = buildRenewalBonusSection(
      [],
      null,
      {} as unknown as Parameters<typeof buildRenewalBonusSection>[2],
      {},
      true,
    );
    const bonusCategoryField = bonusSection.rows[0][0];
    expect(bonusCategoryField.placeholder).toBe("Selecione o tipo de bônus");

    const bonusStatusField = bonusSection.rows[3][0];
    expect(bonusStatusField.placeholder).toBe("Selecione o status");
  });
});
