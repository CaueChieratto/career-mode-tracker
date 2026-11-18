// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ProposalClauseCard from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ProposalClauseCard";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { career, season } from "./factories/domain";

const mockConfirm = vi.fn();

vi.mock("../common/hooks/UseToast", () => ({
  useToast: () => ({
    confirm: mockConfirm,
  }),
}));

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    deleteProposal: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("ManageClauses ProposalClauseCard Tests (Padrão FC Barcelona)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockCareer: Career = career({
    id: "c_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    currency: "€",
    createdAt: new Date("2026-08-01"),
    nation: "ESP",
    clubData: [],
  });

  const mockSeason: ClubData = season({
    id: "s_2026",
    seasonNumber: 1,
    players: [],
    matches: [],
  });

  const readyProposal: TransferProposal = {
    id: "prop_nico_1",
    careerId: "c_barca",
    seasonId: "s_2026",
    type: "compra",
    overallStatus: "aguardando_confirmacao",
    playerId: "p_nico_williams",
    playerName: "Nico Williams",
    playerNation: "Espanha",
    playerPosition: "EE",
    playerSector: "Ataque",
    playerOverall: 85,
    playerAge: 24,
    timing: "Imediata",
    clubNegotiation: {
      partnerClub: "Athletic Club",
      transferFee: 58000000,
      status: "aceita",
    },
    playerNegotiation: {
      weeklyWage: 180000,
      durationYears: 5,
      squadRole: "Crucial",
      status: "aceita",
    },
    createdAt: 1000,
    updatedAt: 1000,
  };

  const pendingProposal: TransferProposal = {
    id: "prop_kimmich_2",
    careerId: "c_barca",
    seasonId: "s_2026",
    type: "compra",
    overallStatus: "em_andamento",
    playerId: "p_kimmich",
    playerName: "Joshua Kimmich",
    playerNation: "Alemanha",
    playerPosition: "VOL",
    playerSector: "Meio-Campo",
    playerOverall: 88,
    playerAge: 31,
    timing: "Imediata",
    clubNegotiation: {
      partnerClub: "Bayern München",
      transferFee: 40000000,
      status: "em_negociacao",
    },
    createdAt: 1000,
    updatedAt: 1000,
  };

  it("renderiza badges de status geral e botões de cláusulas do clube e termos do atleta", () => {
    render(
      <ProposalClauseCard
        proposal={readyProposal}
        career={mockCareer}
        season={mockSeason}
        onEditClub={vi.fn()}
        onEditPlayer={vi.fn()}
        onFinalize={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Nico Williams")).toBeDefined();
    expect(screen.getByText("Athletic Club")).toBeDefined();
    expect(screen.getByText("Aguardando Confirmação")).toBeDefined();
    expect(screen.getByText("Clube: Aceito")).toBeDefined();
    expect(screen.getByText("Atleta: Aceito")).toBeDefined();
    expect(screen.getByRole("button", { name: /Cláusulas do Clube/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Termos do Atleta/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Finalizar Transferência/i })).toBeDefined();
  });

  it("aciona onEditClub e onEditPlayer corretamente ao clicar nos botões", () => {
    const onEditClub = vi.fn();
    const onEditPlayer = vi.fn();

    render(
      <ProposalClauseCard
        proposal={pendingProposal}
        career={mockCareer}
        season={mockSeason}
        onEditClub={onEditClub}
        onEditPlayer={onEditPlayer}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cláusulas do Clube/i }));
    expect(onEditClub).toHaveBeenCalledWith(pendingProposal);

    fireEvent.click(screen.getByRole("button", { name: /Termos do Atleta/i }));
    expect(onEditPlayer).toHaveBeenCalledWith(pendingProposal);
  });

  it("aciona onFinalize ao clicar em Finalizar Transferência", () => {
    const onFinalize = vi.fn();

    render(
      <ProposalClauseCard
        proposal={readyProposal}
        career={mockCareer}
        season={mockSeason}
        onFinalize={onFinalize}
      />,
    );

    const finalizeBtn = screen.getByRole("button", { name: /Finalizar Transferência/i });
    fireEvent.click(finalizeBtn);
    expect(onFinalize).toHaveBeenCalledWith(readyProposal);
  });

  it("aciona onDelete ao clicar em Excluir Proposta", () => {
    const onDelete = vi.fn();

    render(
      <ProposalClauseCard
        proposal={pendingProposal}
        career={mockCareer}
        season={mockSeason}
        onDelete={onDelete}
      />,
    );

    const deleteBtn = screen.getByRole("button", { name: /Excluir Proposta/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(pendingProposal);
  });
});
