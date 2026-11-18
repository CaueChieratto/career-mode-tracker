// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { career, player, season } from "./factories/domain";

describe("TransfersPanel Isolation - Apenas Transferências Concluídas (Padrão FC Barcelona)", () => {
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

  // Jogador com transferência concluída
  const concludedPlayer: Players = player({
    id: "p_pedri",
    name: "Pedri",
    overall: 89,
    position: "MC",
    sector: "Meia",
    age: 23,
    salary: 200000,
    contractTime: 4,
    captain: false,
    sell: false,
    ballonDor: 0,
    statsLeagues: [],
    contract: [
      {
        buyValue: 70000000,
        sellValue: 0,
        fromClub: "Las Palmas",
        leftClub: "",
        dataArrival: new Date("2026-08-10"),
      },
    ],
  });

  // Propostas ativas que NÃO devem ser renderizadas aqui (pertencem à tela de cláusulas)
  const activeProposals: TransferProposal[] = [
    {
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
    },
  ];

  it("renderiza propostas pendentes no TransfersPanel com status Pendente e cor #f59e0b", () => {
    const onOpenScreen = vi.fn();

    render(
      <TransfersPanel
        title="Chegadas"
        transferType="arrivals"
        players={[concludedPlayer]}
        proposals={activeProposals}
        career={mockCareer}
        season={mockSeason}
        onOpenScreen={onOpenScreen}
      />,
    );

    // Verifica que atleta concluído aparece
    expect(screen.getByText("Pedri")).toBeTruthy();

    // Proposta pendente aparece com nome, clube e marcação Pendente
    expect(screen.getByText("N. Williams")).toBeTruthy();
    expect(screen.getByText(/Athletic Club/i)).toBeTruthy();

    const pendingBadge = screen.getByTestId("transfers-panel-proposal-status-prop_nico_1");
    expect(pendingBadge).toBeTruthy();
    expect(pendingBadge.textContent).toBe("Pendente");
    expect(pendingBadge.getAttribute("style")).toContain("color: rgb(245, 158, 11)");

    // Clique na proposta aciona onOpenScreen com a tela de edição de proposta
    const proposalItem = screen.getByTestId("transfers-panel-proposal-prop_nico_1");
    fireEvent.click(proposalItem);
    expect(onOpenScreen).toHaveBeenCalledWith({
      key: "addTransferPlayer",
      proposalId: "prop_nico_1",
      initialProposal: activeProposals[0],
      seasonId: "s_2026",
    });
  });

  it("renderiza propostas de saída pendentes e redireciona para transferPlayer ao clicar", () => {
    const onOpenScreen = vi.fn();
    const exitProposals: TransferProposal[] = [
      {
        id: "prop_ferran_exit",
        careerId: "c_barca",
        seasonId: "s_2026",
        type: "venda",
        overallStatus: "em_andamento",
        playerId: "p_ferran",
        playerName: "Ferran Torres",
        playerNation: "ESP",
        playerPosition: "ATA",
        playerSector: "Ataque",
        clubNegotiation: {
          partnerClub: "Arsenal FC",
          transferFee: 35000000,
          status: "em_negociacao",
        },
      },
    ];

    render(
      <TransfersPanel
        title="Saídas"
        transferType="exit"
        players={[]}
        proposals={exitProposals}
        career={mockCareer}
        season={mockSeason}
        onOpenScreen={onOpenScreen}
      />,
    );

    expect(screen.getByText("F. Torres")).toBeTruthy();
    expect(screen.getByText(/Arsenal FC/i)).toBeTruthy();

    const pendingBadge = screen.getByTestId("transfers-panel-proposal-status-prop_ferran_exit");
    expect(pendingBadge.textContent).toBe("Pendente");

    const proposalItem = screen.getByTestId("transfers-panel-proposal-prop_ferran_exit");
    fireEvent.click(proposalItem);
    expect(onOpenScreen).toHaveBeenCalledWith({
      key: "transferPlayer",
      playerId: "p_ferran",
      proposalId: "prop_ferran_exit",
      initialProposal: exitProposals[0],
      mode: "transfer",
      seasonId: "s_2026",
    });
  });
});
