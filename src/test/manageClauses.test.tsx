// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import React from "react";
import ManageClauses from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { TransferBonus } from "../common/interfaces/playersInfo/transferTerms";
import {
  isContractedArrivalTransfer,
  hasArrivalActiveClauses,
} from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/helpers/arrivalTransferFilter";
import { ModularClausesGrid } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/components/ModularClausesGrid";
import { ClauseOperationalManageView } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ClauseOperationalManageView";
import { TransferClauseCard } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/TransferClauseCard";
import { TransferItem } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/types";
import { ToastProvider } from "../contexts/ToastContext";
import { clearAllToasts } from "../common/services/ToastService";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/Career/c1/Season/season-1" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "c1", seasonId: "season-1" }),
  };
});

vi.mock("../contexts/SeasonThemeContext", () => ({
  SeasonThemeContext: React.createContext({
    clubColor: "#3b82f6",
    darkClubColor: "#1d4ed8",
    activeStyle: {
      backgroundColor: "#3b82f6",
      color: "#ffffff",
      fontWeight: 600,
      border: "1px solid #1d4ed8",
      clubColor: "#3b82f6",
      darkClubColor: "#1d4ed8",
    },
    career: {} as Career,
    changeClubColor: vi.fn(),
  }),
  useSeasonTheme: () => ({
    clubColor: "#3b82f6",
    darkClubColor: "#1d4ed8",
  }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#3b82f6",
    darkClubColor: "#1d4ed8",
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

describe("Gestão de Cláusulas Contratuais (ManageClauses - Cards Inline e Abas Saídas/Chegadas)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const dummySoldPlayerWithClauses: Players = {
    id: "p-sold-1",
    name: "Rodrygo Goes",
    position: "PD",
    shirtNumber: "11",
    age: 23,
    nation: "BRA",
    salary: 180000,
    playerValue: 100000000,
    buy: false,
    captain: false,
    sell: true,
    contractTime: 0,
    ballonDor: 0,
    overall: 86,
    sector: "Ataque",
    statsLeagues: [],
    contract: [
      {
        buyValue: 0,
        sellValue: 90000000,
        fromClub: "",
        leftClub: "Arsenal",
        dataArrival: null,
        dataExit: new Date(),
        timing: "Imediata",
        installments: {
          id: "inst-rec-1",
          direction: "receivable",
          status: "pending",
          percentage: 40,
          totalInstallments: 3,
          remainingInstallments: 3,
          annualInstallmentValue: 12000000,
          upfrontValue: 54000000,
          firstPaymentSeasonNumber: 2,
          partnerClub: "Arsenal",
        },
        bonuses: [
          {
            id: "bonus-ach-1",
            direction: "receivable",
            category: "objective",
            name: "Título de Champions",
            targetObjective: "Vencer Champions League",
            value: 5000000,
            partnerClub: "Arsenal",
            status: "pending",
          },
        ],
        transferClauses: {
          buybackValue: 120000000,
          sellOnPercentage: 15,
          loanBackDuration: 1,
          firstRefusal: true,
          status: "pending",
        },
      },
    ],
  };

  const dummySoldPlayerWithoutClauses: Players = {
    id: "p-sold-2",
    name: "Endrick Felipe",
    position: "ATA",
    shirtNumber: "9",
    age: 18,
    nation: "BRA",
    salary: 100000,
    playerValue: 60000000,
    buy: false,
    captain: false,
    sell: true,
    contractTime: 0,
    ballonDor: 0,
    overall: 80,
    sector: "Ataque",
    statsLeagues: [],
    contract: [
      {
        buyValue: 0,
        sellValue: 60000000,
        fromClub: "",
        leftClub: "Chelsea",
        dataArrival: null,
        dataExit: new Date(),
        timing: "Proxima Janela",
      },
    ],
  };

  const dummyBoughtPlayer: Players = {
    id: "p-bought-1",
    name: "Kylian Mbappé",
    position: "ATA",
    shirtNumber: "7",
    age: 25,
    nation: "FRA",
    salary: 350000,
    playerValue: 180000000,
    buy: true,
    captain: true,
    sell: false,
    contractTime: 5,
    ballonDor: 0,
    overall: 91,
    sector: "Ataque",
    statsLeagues: [],
    contract: [
      {
        buyValue: 120000000,
        sellValue: 0,
        fromClub: "PSG",
        leftClub: "",
        dataArrival: new Date(),
        dataExit: null,
      },
    ],
  };

  const mockCareer: Career = {
    id: "c1",
    clubName: "Real Madrid",
    managerName: "Ancelotti",
    createdAt: new Date(),
    teamBadge: "",
    nation: "ESP",
    currency: "EUR",
    colorsTeams: ["#3b82f6"],
    trophies: [],
    clubData: [],
  };

  const mockSeason: ClubData = {
    id: "season-1",
    seasonNumber: 1,
    players: [
      dummySoldPlayerWithClauses,
      dummySoldPlayerWithoutClauses,
      dummyBoughtPlayer,
    ],
    leagues: [],
    matches: [],
    table: [],
  };

  it("renderiza o cabeçalho 'Cláusulas Contratuais' e as abas 'Saídas' e 'Chegadas'", () => {
    render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /Cláusulas Contratuais/i }),
    ).toBeTruthy();
    expect(screen.getByText(/Saídas \(2\)/i)).toBeTruthy();
    expect(screen.getByText(/Chegadas \(1\)/i)).toBeTruthy();
  });

  it("não renderiza menu drop-down select e lista todas as transferências de saída diretamente em cards", () => {
    render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
      />,
    );

    // Ausência estrita de elemento select (combobox)
    expect(screen.queryByRole("combobox")).toBeNull();

    // Alterna para a aba Saídas no Navbar
    fireEvent.click(screen.getByText(/Saídas \(2\)/i));

    // Ambos os jogadores vendidos devem ter cards visíveis
    expect(screen.getByText("Rodrygo Goes")).toBeTruthy();
    expect(screen.getByText("Arsenal")).toBeTruthy();
    expect(screen.getByText("Endrick Felipe")).toBeTruthy();
    expect(screen.getByText("Chelsea")).toBeTruthy();
  });

  it("exibe resumo de cláusulas e opções separadas de 'Editar' e 'Gerenciar' quando houver cláusulas", () => {
    render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas \(2\)/i));

    const cardRodrygo = screen.getByTestId("transfer-card-p-sold-1");

    expect(cardRodrygo.textContent).toContain("Parcelamento: 40%");
    expect(cardRodrygo.textContent).toContain("Bônus: 1 meta(s)");

    // Botões Editar e Gerenciar presentes no card com cláusulas
    expect(cardRodrygo.querySelector("button")?.textContent).toBeTruthy();
    expect(screen.getByRole("button", { name: /Editar/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gerenciar/i })).toBeTruthy();
  });

  it("exibe opção de 'Adicionar Cláusulas' no card quando não houver nenhuma cláusula", () => {
    render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas \(2\)/i));

    const cardEndrick = screen.getByTestId("transfer-card-p-sold-2");

    expect(cardEndrick.textContent).toContain(
      "Nenhuma cláusula adicional cadastrada nesta transferência.",
    );
    expect(
      screen.getByRole("button", { name: /Adicionar Cláusulas/i }),
    ).toBeTruthy();
  });

  it("abre tela dedicada de Cláusulas do Clube ao clicar em 'Adicionar Cláusulas' em saídas com módulo 0 e Navbar salvando", () => {
    render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas \(2\)/i));

    const addBtn = screen.getByRole("button", {
      name: /Adicionar Cláusulas/i,
    });
    fireEvent.click(addBtn);

    // Tela dedicada de Cláusulas do Clube com Navbar 'Salvar Cláusulas' e 5 módulos (incluindo módulo 0)
    expect(screen.getByText("Cláusulas do Clube")).toBeTruthy();
    expect(screen.getByText("Salvar Cláusulas")).toBeTruthy();
    expect(
      screen.getByText("Painel Modular de Cláusulas Contratuais"),
    ).toBeTruthy();
    expect(
      screen.getByText("0. Data de Saída & Taxa de Transferência"),
    ).toBeTruthy();
    expect(screen.getByText("1. Parcelamento")).toBeTruthy();
    expect(screen.getByText("2. Atleta de Troca")).toBeTruthy();

    // Ao clicar em um card do grid, abre o ClauseSectionDrawer com Concluir e Fechar
    fireEvent.click(
      screen.getByRole("button", { name: /Configurar Parcelamento/i }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Concluir$/i })).toBeTruthy();
    expect(screen.getByText("Fechar")).toBeTruthy();
  });

  it("permite concluir alterações no menu lateral (drawer) e salvar cláusulas pelo Navbar via PlayersContractService", async () => {
    const editTransferSpy = vi
      .spyOn(PlayersContractService, "editTransferInSeason")
      .mockResolvedValue(undefined);

    render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas \(2\)/i));

    const editBtn = screen.getByRole("button", { name: /Editar/i });
    fireEvent.click(editBtn);

    // Abre a gaveta de parcelamento
    fireEvent.click(
      screen.getByRole("button", { name: /Configurar Parcelamento/i }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();

    // Clica em Concluir no drawer (aplica localmente, ainda não salva no Firestore)
    fireEvent.click(screen.getByRole("button", { name: /^Concluir$/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(editTransferSpy).not.toHaveBeenCalled();

    // Clica em Salvar Cláusulas no Navbar para persistir
    fireEvent.click(screen.getByText("Salvar Cláusulas"));

    await waitFor(() => {
      expect(editTransferSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          careerId: "c1",
          seasonId: "season-1",
          playerId: "p-sold-1",
          direction: "exit",
          clubName: "Arsenal",
        }),
      );
    });
  });

  it("expande painel de gerenciamento inline com opção de liquidar parcela e bônus", async () => {
    const settleInstallmentSpy = vi
      .spyOn(PlayersContractService, "settleInstallment")
      .mockResolvedValue(undefined);
    const settleBonusSpy = vi
      .spyOn(PlayersContractService, "settleBonus")
      .mockResolvedValue(undefined);

    render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas \(2\)/i));

    const manageBtn = screen.getByRole("button", { name: /Gerenciar/i });
    fireEvent.click(manageBtn);

    expect(
      screen.getByText("Gerenciamento Operacional de Cláusulas"),
    ).toBeTruthy();

    const settleInstBtn = screen.getByRole("button", {
      name: /Liquidar Próxima Parcela/i,
    });
    fireEvent.click(settleInstBtn);

    await waitFor(() => {
      expect(settleInstallmentSpy).toHaveBeenCalledWith(
        "c1",
        "season-1",
        "p-sold-1",
        0,
      );
    });

    const settleBonusBtn = screen.getByRole("button", {
      name: /Liquidar Bônus/i,
    });
    fireEvent.click(settleBonusBtn);

    await waitFor(() => {
      expect(settleBonusSpy).toHaveBeenCalledWith(
        "c1",
        "season-1",
        "p-sold-1",
        "bonus-ach-1",
      );
    });
  });

  it("permite alternar entre as abas 'Chegadas' e 'Saídas' via Navbar com transição em carrossel Swiper", () => {
    const { container } = render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
      />,
    );

    // Carrossel Swiper com 3 slides renderizados
    const slides = container.querySelectorAll(".swiper-slide");
    expect(slides.length).toBe(3);

    // Alterna para Chegadas (Mbappé do PSG visível no slide de chegadas)
    fireEvent.click(screen.getByText(/Chegadas \(1\)/i));
    const arrivalsSlide = screen.getByTestId("clauses-tab-arrivals");
    expect(within(arrivalsSlide).getByText("Kylian Mbappé")).toBeTruthy();
    expect(within(arrivalsSlide).getByText("PSG")).toBeTruthy();
    expect(within(arrivalsSlide).queryByText("Rodrygo Goes")).toBeNull();

    // Alterna para Saídas
    fireEvent.click(screen.getByText(/Saídas \(2\)/i));
    const exitsSlide = screen.getByTestId("clauses-tab-exit");
    expect(within(exitsSlide).getByText("Rodrygo Goes")).toBeTruthy();
    expect(within(exitsSlide).queryByText("Kylian Mbappé")).toBeNull();
  });

  it("exibe mensagem amigável quando não houver transferências registradas na aba", () => {
    const emptySeason: ClubData = {
      id: "season-empty",
      seasonNumber: 1,
      players: [],
      leagues: [],
      matches: [],
      table: [],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={emptySeason}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Nenhuma renovação registrada nesta temporada."),
    ).toBeTruthy();

    fireEvent.click(screen.getByText(/Chegadas \(0\)/i));

    expect(
      screen.getByText(
        "Nenhuma transferência de chegada registrada nesta temporada.",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByText(/Saídas \(0\)/i));

    expect(
      screen.getByText(
        "Nenhuma transferência de saída registrada nesta temporada.",
      ),
    ).toBeTruthy();
  });

  it("carrega e exibe escudo do clube parceiro buscado no banco de dados com fundo branco", async () => {
    const { ServiceMatches } =
      await import("../common/services/ServiceMatches");
    vi.spyOn(ServiceMatches, "findBadgeAcrossUserCareers").mockResolvedValue(
      "https://images.example.com/psg.png",
    );
    vi.spyOn(ServiceMatches, "findTeamAcrossUserCareers").mockResolvedValue({
      name: "PSG",
      badge: "https://images.example.com/psg.png",
    });

    const { container } = render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    // O card do Mbappé (PSG) na aba Chegadas deve exibir a imagem do escudo buscado no banco
    await waitFor(() => {
      const badgeImg = container.querySelector(
        'img[src="https://images.example.com/psg.png"]',
      );
      expect(badgeImg).not.toBeNull();
      expect(badgeImg?.getAttribute("alt")).toBe("PSG");
      const badgeContainer = badgeImg?.parentElement;
      expect(badgeContainer?.style.backgroundColor).toBe("rgb(255, 255, 255)");
    });
  });

  it("renderiza o Overall do atleta no PlayerCircle dentro do cardHeader com background colorido e texto branco", () => {
    render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    // Na aba Chegadas: Mbappé tem overall 91 (cor #1E88E5)
    const mbappeCircle = screen.getByText("91");
    expect(mbappeCircle).toBeTruthy();
    expect(mbappeCircle.style.color).toBe("rgb(255, 255, 255)");

    // Alterna para Saídas
    fireEvent.click(screen.getByText(/Saídas \(2\)/i));

    // Rodrygo tem overall 86 (cor #2B8A3E), Endrick tem overall 80 (cor #66a80f)
    const rodrygoCircle = screen.getByText("86");
    expect(rodrygoCircle).toBeTruthy();
    expect(rodrygoCircle.style.color).toBe("rgb(255, 255, 255)");

    const endrickCircle = screen.getByText("80");
    expect(endrickCircle).toBeTruthy();
    expect(endrickCircle.style.color).toBe("rgb(255, 255, 255)");
  });

  it("renderiza status 'Concluída' no cardHeaderRight quando oficializada e timing agendado quando pendente", () => {
    render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    // Na aba Chegadas: Mbappé é transferência imediata -> 'Chegada: Concluída'
    const cardMbappe = screen.getByTestId("transfer-card-p-bought-1");
    expect(cardMbappe.textContent).toContain("Chegada: ");
    expect(cardMbappe.textContent).toContain("Concluída");

    // Alterna para Saídas
    fireEvent.click(screen.getByText(/Saídas \(2\)/i));

    // Rodrygo é transferência imediata -> 'Saída: Concluída'
    const cardRodrygo = screen.getByTestId("transfer-card-p-sold-1");
    expect(cardRodrygo.textContent).toContain("Saída: ");
    expect(cardRodrygo.textContent).toContain("Concluída");

    // Endrick é Proxima Janela sem partidas da janela ainda -> 'Saída: Proxima Janela'
    const cardEndrick = screen.getByTestId("transfer-card-p-sold-2");
    expect(cardEndrick.textContent).toContain("Saída: ");
    expect(cardEndrick.textContent).toContain("Proxima Janela");
  });

  it("busca rápida por SearchableSelect filtra por aba e não é exibida na tela de edição ou gerenciamento", () => {
    // Simula scrollIntoView no jsdom
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    render(
      <ManageClauses
        career={mockCareer}
        season={mockSeason}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    // 1. Na aba Chegadas: o input de busca rápida está presente com placeholder específico
    const searchInput = screen.getByPlaceholderText(
      "Pesquisar jogador em chegadas...",
    ) as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    // 2. Alterna para a aba Saídas: o placeholder atualiza
    fireEvent.click(screen.getByText(/Saídas \(2\)/i));
    const searchInputExits = screen.getByPlaceholderText(
      "Pesquisar jogador em saídas...",
    ) as HTMLInputElement;
    expect(searchInputExits).toBeTruthy();

    // Digita "Rodrygo" para pesquisar
    fireEvent.change(searchInputExits, { target: { value: "Rodrygo Goes" } });
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();

    // 3. Ao entrar no modo de edição (Editar), o SearchableSelect NÃO deve ser renderizado
    const editBtn = screen.getByRole("button", { name: /Editar/i });
    fireEvent.click(editBtn);
    expect(
      screen.queryByPlaceholderText("Pesquisar jogador em saídas..."),
    ).toBeNull();
  });

  it("permite desfazer parcela paga acidentalmente ao editar o número de parcelas pagas", async () => {
    const editTransferSpy = vi
      .spyOn(PlayersContractService, "editTransferInSeason")
      .mockResolvedValue(undefined);

    // Jogador com 3 parcelas no total e 2 já pagas (restando 1 parcela)
    const playerWithPartiallyPaid: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p-partial-paid",
      contract: [
        {
          ...dummySoldPlayerWithClauses.contract[0],
          installments: {
            ...dummySoldPlayerWithClauses.contract[0].installments!,
            totalInstallments: 3,
            remainingInstallments: 1, // 2 foram pagas
            status: "pending",
          },
        },
      ],
    };

    const seasonWithPartial: ClubData = {
      ...mockSeason,
      players: [playerWithPartiallyPaid],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonWithPartial}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas \(1\)/i));

    // Clica em Editar
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));

    // Abre a gaveta de parcelamento
    fireEvent.click(
      screen.getByRole("button", { name: /Configurar Parcelamento/i }),
    );

    // O CustomSelect de parcelas pagas exibe "2 parcelas pagas"
    const paidSelectTrigger = screen.getByText("2 parcelas pagas");
    fireEvent.mouseDown(paidSelectTrigger);

    // Altera para "0 parcelas pagas" para desfazer as parcelas pagas por engano
    const zeroOption = screen.getByRole("option", { name: "0 parcelas pagas" });
    fireEvent.mouseDown(zeroOption);

    // Conclui no menu lateral e salva pelo Navbar
    fireEvent.click(screen.getByRole("button", { name: /^Concluir$/i }));
    fireEvent.click(screen.getByText("Salvar Cláusulas"));

    await waitFor(() => {
      expect(editTransferSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          installments: expect.objectContaining({
            totalInstallments: 3,
            remainingInstallments: 3, // Restaurou todas as parcelas restantes!
            status: "pending",
          }),
        }),
      );
    });
  });

  it("permite desfazer liquidação de bônus de Liquidado para Pendente na tela de edição", async () => {
    const editTransferSpy = vi
      .spyOn(PlayersContractService, "editTransferInSeason")
      .mockResolvedValue(undefined);

    // Jogador com bônus já liquidado
    const playerWithPaidBonus: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p-bonus-paid",
      contract: [
        {
          ...dummySoldPlayerWithClauses.contract[0],
          bonuses: [
            {
              id: "bonus-paid-1",
              direction: "receivable",
              category: "objective",
              name: "Título de Champions",
              targetObjective: "Vencer Champions League",
              value: 5000000,
              partnerClub: "Arsenal",
              status: "paid",
              paid: true,
            },
          ],
        },
      ],
    };

    const seasonWithPaidBonus: ClubData = {
      ...mockSeason,
      players: [playerWithPaidBonus],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonWithPaidBonus}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas \(1\)/i));

    // Clica em Editar
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));

    // Abre a gaveta de bônus
    fireEvent.click(
      screen.getByRole("button", { name: /Adicionar \/ Editar Bônus/i }),
    );

    // Deve exibir o badge "Status: Liquidado" na lista de bônus
    expect(screen.getByText(/Liquidado/)).toBeTruthy();

    // Clica no botão de editar o item de bônus da lista
    const editBonusItemBtn = screen.getByTitle("Editar bônus");
    fireEvent.click(editBonusItemBtn);

    // Abre o select de status do bônus (segundo combobox no formulário de bônus)
    const comboboxes = screen.getAllByRole("combobox");
    const bonusStatusCombobox = comboboxes[comboboxes.length - 1];
    fireEvent.mouseDown(bonusStatusCombobox);

    // Altera para "Pendente" para desfazer a liquidação
    const pendingOption = screen.getByRole("option", { name: "Pendente" });
    fireEvent.mouseDown(pendingOption);

    // Clica em Salvar Alterações do bônus
    const updateBonusBtn = screen.getByRole("button", {
      name: "Salvar Alterações",
    });
    fireEvent.click(updateBonusBtn);

    // Clica em Concluir no menu lateral e salva pelo Navbar
    fireEvent.click(screen.getByRole("button", { name: "Concluir" }));
    fireEvent.click(screen.getByText("Salvar Cláusulas"));

    await waitFor(() => {
      expect(editTransferSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          bonuses: [
            expect.objectContaining({
              id: "bonus-paid-1",
              status: "pending",
              paid: false,
            }),
          ],
        }),
      );
    });
  });

  it("rola para o topo ao clicar em Editar/Gerenciar e rola de volta para o card clicado ao clicar em Voltar para a lista", async () => {
    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [dummySoldPlayerWithClauses],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        onClose={vi.fn()}
      />,
    );

    // Muda para a aba Saídas
    fireEvent.click(screen.getByText(/Saídas/));

    // Clica em Editar
    const editBtn = screen.getByRole("button", { name: /Editar/i });
    fireEvent.click(editBtn);

    // Verifica que rolou para o topo
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });

    // Volta pelo botão Voltar do HeaderSeason na tela dedicada
    const backBtn = screen.getByRole("button", { name: /^Voltar$/i });
    fireEvent.click(backBtn);

    // Ao voltar, verifica que o card clicado recebe o scroll e destaque visual
    await waitFor(() => {
      const card = screen.getByTestId("transfer-card-p-sold-1");
      expect(card.className).toContain("cardHighlight");
    });
  });

  it("exercita Recompra com sucesso chamando onOpenScreen com prefill e fechando a tela", async () => {
    const onOpenScreen = vi.fn();
    const onClose = vi.fn();
    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [dummySoldPlayerWithClauses],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        onClose={onClose}
        onOpenScreen={onOpenScreen}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas/));
    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

    const buybackBtn = screen.getByTestId("btn-exercise-buyback");
    expect(buybackBtn).toBeTruthy();
    fireEvent.click(buybackBtn);

    expect(onOpenScreen).toHaveBeenCalledWith({
      key: "addTransferPlayer",
      seasonId: "season-1",
      prefill: {
        player: dummySoldPlayerWithClauses,
        fromClub: "Arsenal",
        buyValue: "120000000",
        mode: "buyback",
        sourceSeasonId: "season-1",
        sourcePlayerId: "p-sold-1",
        sourceContractIndex: 0,
      },
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("exercita Direito de Preferência chamando onOpenScreen com prefill e mantendo a tela ativa", async () => {
    const onOpenScreen = vi.fn();
    const onClose = vi.fn();
    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [dummySoldPlayerWithClauses],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        onClose={onClose}
        onOpenScreen={onOpenScreen}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas/));
    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

    const firstRefusalBtn = screen.getByTestId("btn-exercise-first-refusal");
    expect(firstRefusalBtn).toBeTruthy();
    fireEvent.click(firstRefusalBtn);

    expect(onOpenScreen).toHaveBeenCalledWith({
      key: "addTransferPlayer",
      seasonId: "season-1",
      prefill: {
        player: dummySoldPlayerWithClauses,
        fromClub: "Arsenal",
        mode: "firstRefusal",
        sourceSeasonId: "season-1",
        sourcePlayerId: "p-sold-1",
        sourceContractIndex: 0,
      },
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ativa taxa de revenda futura via menu lateral (drawer), calcula porcentagem e liquida via settleSellOnClause", async () => {
    const settleSellOnSpy = vi
      .spyOn(PlayersContractService, "settleSellOnClause")
      .mockResolvedValue(7500000);

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [dummySoldPlayerWithClauses],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas/));
    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

    // Clica para abrir o box de ativação de futura venda
    const toggleSellOnBtn = screen.getByTestId("btn-toggle-sellon");
    fireEvent.click(toggleSellOnBtn);

    const activationBox = screen.getByTestId("sellon-activation-box");
    expect(activationBox).toBeTruthy();

    // Digita o valor total da venda futura (50000000)
    const totalInput = screen.getByTestId("sellon-total-input");
    fireEvent.change(totalInput, { target: { value: "50000000" } });

    // Verifica que o preview de 15% calcula 7.500.000
    expect(screen.getByText(/7.5M/)).toBeTruthy();

    // Clica em confirmar recebimento
    const confirmBtn = screen.getByTestId("btn-confirm-sellon");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(settleSellOnSpy).toHaveBeenCalledWith(
        mockCareer.id,
        seasonData.id,
        dummySoldPlayerWithClauses.id,
        0,
        50000000,
        "01/07",
      );
    });
  });

  it("exibe bônus de desempenho com contagem de meta no OperationalCard de gerenciamento", async () => {
    const playerWithPerfBonus: Players = {
      ...dummySoldPlayerWithClauses,
      contract: [
        {
          ...dummySoldPlayerWithClauses.contract![0],
          bonuses: [
            {
              id: "bonus-perf-1",
              direction: "receivable",
              category: "performance",
              bonusCategory: "Desempenho",
              name: "Gols marcados",
              bonusTarget: "Gols marcados",
              targetCount: 15,
              metricTarget: 15,
              value: 3000000,
              partnerClub: "Arsenal",
              status: "pending",
            },
          ],
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [playerWithPerfBonus],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Saídas/));
    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

    // Deve exibir o título com o contador (15 Gols marcados)
    expect(screen.getByText("15 Gols marcados")).toBeTruthy();
    // Deve exibir Meta: 15 nos metadados
    expect(screen.getByText(/Meta: 15/)).toBeTruthy();
  });

  it("exibe a 3ª aba 'Renovações' no Navbar e isola as renovações de chegadas e saídas", async () => {
    const renewedPlayer: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_ren_1",
      name: "Arrascaeta",
      position: "MEI",
      age: 30,
      salary: 400000,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 400000,
          contractUntil: "31/12/2028",
          bonuses: [
            {
              id: "b_ren_1",
              direction: "payable",
              category: "objective",
              bonusCategory: "Objetivo atingido",
              name: "Ser campeão da liga",
              bonusTarget: "Ser campeão da liga",
              value: 1000000,
              partnerClub: "",
              status: "pending",
            },
          ],
          contractClauses: {
            releaseClause: 150000000,
            wageAdjustment: {
              targetObjective: "Ser campeão da liga",
              percentage: 10,
              direction: "Aumentar",
              applied: false,
              status: "pending",
            },
          },
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [renewedPlayer],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    // Navbar deve conter 3 abas
    expect(screen.getByText(/Renovações \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Chegadas \(0\)/)).toBeTruthy();
    expect(screen.getByText(/Saídas \(0\)/)).toBeTruthy();

    // Na aba Chegadas, lista de renovados NÃO aparece
    expect(screen.queryByText("Arrascaeta")).toBeNull();

    // Clica na aba Renovações
    fireEvent.click(screen.getByText(/Renovações \(1\)/));

    // Agora o card de Arrascaeta aparece
    expect(screen.getAllByText("Arrascaeta").length).toBeGreaterThan(0);
    expect(screen.getByText("Renovação")).toBeTruthy();
    expect(screen.getByText("31/12/2028")).toBeTruthy();
    expect(screen.getByText("Salário Semanal:")).toBeTruthy();
    expect(screen.getByText(/Multa rescisória:/)).toBeTruthy();
    expect(screen.getByText(/Ajuste salarial \(Aumentar 10%\):/)).toBeTruthy();
  });

  it("permite gerenciar bônus e aplicar ajuste salarial na aba Renovações", async () => {
    const settleBonusSpy = vi
      .spyOn(PlayersContractService, "settleBonus")
      .mockResolvedValue(undefined);
    const applyWageSpy = vi
      .spyOn(PlayersContractService, "applyRenewalWageAdjustment")
      .mockResolvedValue(440000);

    const renewedPlayer: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_ren_manage",
      name: "Bruno Henrique",
      position: "ATA",
      age: 33,
      salary: 300000,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 300000,
          contractUntil: "31/12/2026",
          bonuses: [
            {
              id: "b_ren_bh",
              direction: "payable",
              category: "performance",
              bonusCategory: "Desempenho",
              name: "Gols marcados",
              bonusTarget: "Gols marcados",
              value: 500000,
              partnerClub: "",
              status: "pending",
            },
          ],
          contractClauses: {
            wageAdjustment: {
              targetObjective: "Vencer a copa",
              percentage: 15,
              direction: "Aumentar",
              applied: false,
              status: "pending",
            },
          },
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [renewedPlayer],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        onClose={vi.fn()}
      />,
    );

    // Clica na aba Renovações
    fireEvent.click(screen.getByText(/Renovações/));

    // Clica no botão Gerenciar
    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

    // Deve exibir o subtítulo correto
    expect(
      screen.getByText("Liquidação de bônus e aplicação de ajuste salarial"),
    ).toBeTruthy();

    // Deve exibir card de Ajuste Salarial Automático
    expect(screen.getByText("Ajuste Salarial Automático")).toBeTruthy();
    expect(screen.getByText(/Critério: Vencer a copa/)).toBeTruthy();

    // Botão de aplicar ajuste
    const applyBtn = screen.getByTestId("btn-apply-wage-adjustment");
    expect(applyBtn).toBeTruthy();
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(applyWageSpy).toHaveBeenCalledWith(
        "c1",
        "season-1",
        "p_ren_manage",
        0,
      );
    });

    // Botão de liquidar bônus
    const settleBtn = screen.getByRole("button", { name: /Liquidar Bônus/i });
    expect(settleBtn).toBeTruthy();
    fireEvent.click(settleBtn);

    await waitFor(() => {
      expect(settleBonusSpy).toHaveBeenCalledWith(
        "c1",
        "season-1",
        "p_ren_manage",
        "b_ren_bh",
      );
    });
  });

  it("renderiza visualização comparativa de contrato antigo vs novo na .clubSection de renovações", async () => {
    const renewedPlayerWithPrev: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_ren_comp",
      name: "Pedro Guilherme",
      position: "ATA",
      age: 27,
      salary: 350000,
      contractTime: 4,
      contractUntil: "31/12/2028",
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "Fiorentina",
          leftClub: "",
          dataArrival: new Date("2020-01-01"),
          salary: 200000,
          contractTime: 2,
          contractUntil: "31/12/2026",
        },
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 350000,
          contractTime: 4,
          contractUntil: "31/12/2028",
          previousSalary: 200000,
          previousContractTime: 2,
          previousContractUntil: "31/12/2026",
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [renewedPlayerWithPrev],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
      />,
    );

    // renewalHeader foi removido do card de renovação a pedido do usuário
    expect(screen.queryByText("aaaaaaaa")).toBeNull();

    // Salário comparativo: antigo (200k) e novo (350k)
    expect(screen.getByText("Salário Semanal:")).toBeTruthy();
    expect(screen.getByText(/200k/)).toBeTruthy();
    expect(screen.getByText(/350k/)).toBeTruthy();

    // Duração comparativa: 2 anos (até 31/12/2026) -> 4 anos (até 31/12/2028)
    expect(screen.getByText("Duração do Contrato:")).toBeTruthy();
    expect(screen.getByText(/2 anos \(até 31\/12\/2026\)/)).toBeTruthy();
    expect(screen.getByText(/4 anos \(até 31\/12\/2028\)/)).toBeTruthy();
  });

  it("renderiza botão Excluir alinhado à esquerda e dispara deletePlayerRenewal ao confirmar", async () => {
    const deleteSpy = vi
      .spyOn(PlayersContractService, "deletePlayerRenewal")
      .mockResolvedValue({
        ...dummySoldPlayerWithClauses,
        id: "p_ren_del",
        name: "Gerson",
        salary: 150000,
        contractTime: 1,
        contractUntil: "31/12/2025",
        contract: [],
      } as unknown as Players);

    clearAllToasts();

    const renewedPlayer: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_ren_del",
      name: "Gerson",
      position: "MC",
      age: 27,
      salary: 300000,
      contractTime: 3,
      contractUntil: "31/12/2027",
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "Marseille",
          leftClub: "",
          dataArrival: new Date("2023-01-01"),
          salary: 150000,
          contractTime: 1,
          contractUntil: "31/12/2025",
        },
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 300000,
          contractTime: 3,
          contractUntil: "31/12/2027",
          previousSalary: 150000,
          previousContractTime: 1,
          previousContractUntil: "31/12/2025",
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [renewedPlayer],
    };

    render(
      <ToastProvider>
        <ManageClauses
          career={mockCareer}
          season={seasonData}
          initialTab="renewals"
          onClose={vi.fn()}
        />
      </ToastProvider>,
    );

    // Botão Reverter deve existir com testid
    const deleteBtn = screen.getByTestId("btn-delete-renewal-p_ren_del");
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn.textContent).toContain("Reverter");

    // Clica em Reverter
    fireEvent.click(deleteBtn);

    const confirmAccept = await screen.findByTestId("toast-confirm-accept");
    expect(confirmAccept).toBeTruthy();
    fireEvent.click(confirmAccept);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith({
        careerId: "c1",
        seasonId: "season-1",
        playerId: "p_ren_del",
        contractIndex: 1,
      });
    });

    // O card sai da tela imediatamente sem necessidade de F5
    await waitFor(() => {
      expect(screen.queryByTestId("btn-delete-renewal-p_ren_del")).toBeNull();
    });
  });

  it("exercita Multa Rescisória na tela de gerenciar chamando onOpenScreen com prefill e valor travado", async () => {
    const onOpenScreen = vi.fn();
    const renewedPlayerWithReleaseClause: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_ren_release",
      name: "Gerson",
      salary: 300000,
      contractTime: 3,
      contractUntil: "31/12/2027",
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 300000,
          contractTime: 3,
          contractUntil: "31/12/2027",
          releaseClause: "250M",
          contractClauses: {
            releaseClause: 250000000,
          },
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [renewedPlayerWithReleaseClause],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
        onOpenScreen={onOpenScreen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

    const releaseCard = screen.getByTestId("manage-release-clause-card");
    expect(releaseCard).toBeTruthy();
    expect(releaseCard.textContent).toContain("Multa Rescisória");

    const exerciseBtn = screen.getByTestId("btn-trigger-release-clause");
    expect(exerciseBtn).toBeTruthy();
    fireEvent.click(exerciseBtn);

    expect(onOpenScreen).toHaveBeenCalledWith({
      key: "transferPlayer",
      playerId: "p_ren_release",
      mode: "transfer",
      prefill: {
        sellValue: "250m",
        lockSellValue: true,
      },
    });
  });

  it("salva ajuste automático de salário pelo drawer de cláusulas especiais na aba Renovações", async () => {
    const updateSpy = vi
      .spyOn(PlayersContractService, "updateRenewalClauses")
      .mockResolvedValue({} as Players);

    const playerWithCleanRenewal: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_ren_clean",
      name: "Pedro",
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 400000,
          contractTime: 3,
          contractUntil: "31/12/2027",
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [playerWithCleanRenewal],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));

    fireEvent.click(screen.getByText("Ajustar Acordos Especiais"));
    const drawer = screen.getByRole("dialog", { name: "Cláusulas Especiais" });

    const wageTypeSelect = within(drawer).getByText("N/D");
    fireEvent.mouseDown(wageTypeSelect);
    const optionDiminuir = screen.getByRole("option", { name: "Diminuir" });
    fireEvent.mouseDown(optionDiminuir);

    const criteriaInput = within(drawer).getByPlaceholderText(
      "Selecione o critério...",
    );
    fireEvent.change(criteriaInput, { target: { value: "Rebaixamento" } });

    fireEvent.click(within(drawer).getByRole("button", { name: /Concluir/i }));
    fireEvent.click(screen.getByText("Salvar Termos"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: "p_ren_clean",
          wageAdjustment: expect.objectContaining({
            direction: "Diminuir",
            targetObjective: "Rebaixamento",
            enabled: true,
          }),
        }),
      );
    });
  });
  it("permite editar salário, taxa de contratação e tempo de contrato da renovação pelo drawer de informações do contrato", async () => {
    const updateSpy = vi
      .spyOn(PlayersContractService, "updateRenewalClauses")
      .mockResolvedValue({} as Players);

    const playerWithRenewal: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_ren_edit_base",
      name: "Vinicius Jr",
      salary: 500000,
      contractTime: 2,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 500000,
          contractTime: 2,
          contractUntil: "31/12/2026",
          signingBonus: "1M",
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [playerWithRenewal],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));

    // Card 1: Informações do Contrato deve estar presente
    expect(screen.getByText("1. Informações do Contrato")).toBeTruthy();
    fireEvent.click(screen.getByText("Ajustar Informações do Contrato"));

    const drawer = screen.getByRole("dialog", {
      name: "Informações do Contrato",
    });
    expect(drawer).toBeTruthy();

    const salaryInput = within(drawer).getByPlaceholderText("Ex: 500k, 1.2M");
    const durationInput =
      within(drawer).getByPlaceholderText("Ex: 0, 1, 2 anos");
    const bonusInput = within(drawer).getByPlaceholderText("Ex: 5M, 500k");

    fireEvent.change(salaryInput, { target: { value: "750k" } });
    fireEvent.change(durationInput, { target: { value: "4" } });
    fireEvent.change(bonusInput, { target: { value: "3M" } });

    fireEvent.click(within(drawer).getByRole("button", { name: /Concluir/i }));
    fireEvent.click(screen.getByText("Salvar Termos"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: "p_ren_edit_base",
          salary: "750k",
          contractTime: 4,
          signingBonus: "3M",
        }),
      );
    });
  });

  it("não exibe botões de reverter no gerenciamento operacional de renovações e permite desfazer liquidação pelo menu lateral", async () => {
    const updateSpy = vi
      .spyOn(PlayersContractService, "updateRenewalClauses")
      .mockResolvedValue({} as Players);

    const playerWithPaidBonus: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_paid_bonus",
      name: "Mbappe",
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 600000,
          contractTime: 3,
          bonuses: [
            {
              id: "bonus_paid_123",
              direction: "payable",
              category: "objective",
              name: "Artilharia",
              bonusTarget: "Artilharia da Liga",
              value: 2000000,
              partnerClub: "",
              status: "paid",
              paid: true,
            },
          ],
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [playerWithPaidBonus],
    };

    const { unmount } = render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
      />,
    );

    // 1. No gerenciamento operacional, botões de reverter não devem existir
    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));
    expect(screen.getByText(/Liquidado/i)).toBeTruthy();
    expect(
      screen.queryByTestId("btn-unsettle-bonus-bonus_paid_123"),
    ).toBeNull();
    expect(screen.queryByText(/Retirar Pagamento/i)).toBeNull();

    unmount();

    // 2. Desfazendo a liquidação através do menu lateral (igual ao tab de saídas)
    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
      />,
    );

    // Clica em Editar
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));

    // Abre a gaveta lateral de bônus
    fireEvent.click(
      screen.getByRole("button", { name: /Adicionar \/ Editar Bônus/i }),
    );

    // Deve exibir o badge de Liquidado na lista da gaveta
    expect(screen.getByText(/Status: Liquidado/i)).toBeTruthy();

    // Clica no botão de editar o bônus
    const editBonusBtn = screen.getByTitle("Editar bônus");
    fireEvent.click(editBonusBtn);

    // Abre o combobox de status do bônus
    const comboboxes = screen.getAllByRole("combobox");
    const bonusStatusCombobox = comboboxes[comboboxes.length - 1];
    fireEvent.mouseDown(bonusStatusCombobox);

    // Seleciona "Pendente"
    const pendingOption = screen.getByRole("option", { name: "Pendente" });
    fireEvent.mouseDown(pendingOption);

    // Salva as alterações do bônus
    const saveBonusItemBtn = screen.getByRole("button", {
      name: "Salvar Alterações",
    });
    fireEvent.click(saveBonusItemBtn);

    // Conclui na gaveta lateral e salva no Navbar
    const drawer = screen.getByRole("dialog", { name: "Bônus & Metas" });
    fireEvent.click(
      within(drawer).getByRole("button", { name: /^Concluir$/i }),
    );
    fireEvent.click(screen.getByText("Salvar Termos"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: "p_paid_bonus",
          bonuses: [
            expect.objectContaining({
              id: "bonus_paid_123",
              status: "pending",
              paid: false,
            }),
          ],
        }),
      );
    });
  });

  it("não exibe botão de reverter ajuste salarial no gerenciamento operacional e permite reverter ajuste pelo menu lateral", async () => {
    const revertWageSpy = vi
      .spyOn(PlayersContractService, "revertRenewalWageAdjustment")
      .mockResolvedValue(500000);
    const updateSpy = vi
      .spyOn(PlayersContractService, "updateRenewalClauses")
      .mockResolvedValue({} as Players);

    const playerWithAppliedWageAdj: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_applied_wage",
      name: "Bellingham",
      salary: 550000,
      contractTime: 4,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 550000,
          contractTime: 4,
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Aumentar",
              percentage: 10,
              targetObjective: "Título de Liga",
              applied: true,
              status: "applied",
            },
          },
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [playerWithAppliedWageAdj],
    };

    const { unmount } = render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
      />,
    );

    // 1. No gerenciamento operacional, botão de reverter não deve existir
    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));
    expect(screen.getAllByText(/Aplicado/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("btn-revert-wage-adjustment")).toBeNull();
    expect(screen.queryByText(/Reverter Ajuste Salarial/i)).toBeNull();

    unmount();

    // 2. Revertendo o ajuste salarial pelo menu lateral (gaveta de cláusulas especiais)
    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
      />,
    );

    // Clica em Editar
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));

    // Abre a gaveta de Acordos Especiais
    fireEvent.click(screen.getByText("Ajustar Acordos Especiais"));
    const drawer = screen.getByRole("dialog", { name: "Cláusulas Especiais" });
    expect(drawer).toBeTruthy();

    // Abre o combobox de status do ajuste
    const statusCombobox = within(drawer).getByText("Aplicado");
    fireEvent.mouseDown(statusCombobox);

    // Seleciona "Pendente"
    const pendingOption = screen.getByRole("option", { name: "Pendente" });
    fireEvent.mouseDown(pendingOption);

    // Conclui na gaveta lateral e salva no Navbar
    fireEvent.click(
      within(drawer).getByRole("button", { name: /^Concluir$/i }),
    );
    fireEvent.click(screen.getByText("Salvar Termos"));

    await waitFor(() => {
      expect(revertWageSpy).toHaveBeenCalledWith(
        mockCareer.id,
        "season-1",
        "p_applied_wage",
        0,
      );
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: "p_applied_wage",
          wageAdjustment: expect.objectContaining({
            applied: false,
            status: "pending",
          }),
        }),
      );
    });
  });

  it("exibe botão de reverter ajuste salarial automático no menu lateral ao editar e reverte com sucesso", async () => {
    const revertWageSpy = vi
      .spyOn(PlayersContractService, "revertRenewalWageAdjustment")
      .mockResolvedValue(100000);

    const playerWithAppliedWage: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_btn_revert_wage",
      name: "Pedri",
      age: 22,
      overall: 86,
      salary: 110000,
      position: "MC",
      sector: "Meio-Campo",
      contractTime: 3,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          salary: 110000,
          contractTime: 3,
          isRenewal: true,
          seasonId: "season-1",
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Aumentar",
              percentage: 10,
              targetObjective: "Título da Champions",
              status: "applied",
              applied: true,
              preAdjustmentSalary: 100000,
            },
          },
        },
      ],
    };

    const seasonData: ClubData = {
      ...mockCareer.clubData[0],
      id: "season-1",
      seasonNumber: 1,
      players: [playerWithAppliedWage],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
      />,
    );

    // Clica em Editar
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));

    // Abre a gaveta de Informações do Contrato
    fireEvent.click(screen.getByText("Ajustar Informações do Contrato"));
    const drawer = screen.getByRole("dialog", {
      name: "Informações do Contrato",
    });
    expect(drawer).toBeTruthy();

    // Botão de reverter ajuste salarial automático deve estar presente na gaveta de Informações do Contrato
    const revertBtn = screen.getByTestId("btn-drawer-revert-wage-adjustment");
    expect(revertBtn).toBeTruthy();
    expect(revertBtn.textContent).toContain(
      "Reverter Ajuste Salarial Automático",
    );

    // 1. Clica no botão de reverter
    fireEvent.click(revertBtn);

    // O banco AINDA NÃO deve ter sido chamado (salva apenas ao clicar em Salvar/Concluir)
    expect(revertWageSpy).not.toHaveBeenCalled();

    // Clica em Fechar no menu lateral (descarta alterações e não toca no banco)
    fireEvent.click(within(drawer).getByText("Fechar"));
    expect(revertWageSpy).not.toHaveBeenCalled();

    // 2. Abre novamente a gaveta de Informações do Contrato
    fireEvent.click(screen.getByText("Ajustar Informações do Contrato"));
    const drawer2 = screen.getByRole("dialog", {
      name: "Informações do Contrato",
    });
    const revertBtn2 = within(drawer2).getByTestId(
      "btn-drawer-revert-wage-adjustment",
    );
    fireEvent.click(revertBtn2);
    expect(revertWageSpy).not.toHaveBeenCalled();

    // Clica em Concluir no menu lateral e Salvar Termos no Navbar para persistir as alterações
    fireEvent.click(
      within(drawer2).getByRole("button", { name: /^Concluir$/i }),
    );
    expect(revertWageSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Salvar Termos"));

    await waitFor(() => {
      expect(revertWageSpy).toHaveBeenCalledWith(
        mockCareer.id,
        "season-1",
        "p_btn_revert_wage",
        0,
      );
    });
  });

  it("permite desfazer pagamento de parcela no painel de gerenciamento operacional", async () => {
    const unsettleInstSpy = vi
      .spyOn(PlayersContractService, "unsettleInstallment")
      .mockResolvedValue(undefined);

    const playerWithPaidInst: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_paid_inst",
      name: "Camavinga",
      contract: [
        {
          ...dummySoldPlayerWithClauses.contract[0],
          buyValue: 0,
          sellValue: 30000000,
          fromClub: "",
          leftClub: "Arsenal",
          dataArrival: new Date("2024-01-01"),
          isRenewal: false,
          seasonId: "season-1",
          installments: {
            ...dummySoldPlayerWithClauses.contract[0].installments!,
            totalInstallments: 3,
            remainingInstallments: 1,
            annualInstallmentValue: 10000000,
            direction: "receivable",
            status: "pending",
          },
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [playerWithPaidInst],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="exit"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

    const undoInstBtn = screen.getByTestId("btn-unsettle-installment");
    expect(undoInstBtn).toBeTruthy();
    expect(undoInstBtn.textContent).toContain("Desfazer Pagamento da Parcela");

    fireEvent.click(undoInstBtn);

    await waitFor(() => {
      expect(unsettleInstSpy).toHaveBeenCalledWith(
        mockCareer.id,
        "season-1",
        "p_paid_inst",
        0,
      );
    });
  });

  it("renderiza os 3 blocos analíticos de projeção financeira no card de renovação", () => {
    const playerWithProjection: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_ren_proj",
      name: "Rodrygo Silva",
      salary: 10000,
      contractTime: 2,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 10000,
          contractTime: 2,
          contractUntil: "31/12/2026",
          signingBonus: "50k",
          bonuses: [
            {
              id: "b_proj_1",
              category: "objective",
              name: "Gols",
              bonusTarget: "15 gols",
              value: 20000,
              partnerClub: "",
              status: "pending",
              direction: "payable",
            },
          ],
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [playerWithProjection],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Projeção Financeira")).toBeTruthy();
    expect(screen.getByText("Média Anual")).toBeTruthy();
    expect(screen.getByText("Garantido")).toBeTruthy();
    expect(screen.getByText("Potencial")).toBeTruthy();
  });

  it("reverte alterações não salvas ao fechar ou cancelar gaveta lateral (drawer) no ManageClauses", async () => {
    const playerWithRenewal: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_ren_rollback",
      name: "Jude Bellingham",
      salary: 500000,
      contractTime: 2,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 500000,
          contractTime: 2,
          contractUntil: "31/12/2026",
        },
      ],
    };

    const seasonData: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [playerWithRenewal],
    };

    render(
      <ManageClauses
        career={mockCareer}
        season={seasonData}
        initialTab="renewals"
        onClose={vi.fn()}
      />,
    );

    // Entra em modo de edição
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));

    // Abre a gaveta de informações do contrato
    fireEvent.click(screen.getByText("Ajustar Informações do Contrato"));
    const drawer = screen.getByRole("dialog", {
      name: "Informações do Contrato",
    });
    expect(drawer).toBeTruthy();

    const salaryInput = within(drawer).getByPlaceholderText(
      "Ex: 500k, 1.2M",
    ) as HTMLInputElement;
    expect(salaryInput.value).toBe("500k");

    // Altera o salário no input para 999k sem salvar
    fireEvent.change(salaryInput, { target: { value: "999k" } });
    expect(salaryInput.value).toBe("999k");

    // Clica em Fechar
    fireEvent.click(within(drawer).getByText("Fechar"));

    // A gaveta fecha
    expect(
      screen.queryByRole("dialog", { name: "Informações do Contrato" }),
    ).toBeNull();

    // Reabre a gaveta: o valor NÃO deve ter sido salvo, deve voltar para 500k
    fireEvent.click(screen.getByText("Ajustar Informações do Contrato"));
    const reopenedDrawer = screen.getByRole("dialog", {
      name: "Informações do Contrato",
    });
    const reopenedSalaryInput = within(reopenedDrawer).getByPlaceholderText(
      "Ex: 500k, 1.2M",
    ) as HTMLInputElement;
    expect(reopenedSalaryInput.value).toBe("500k");
  });

  describe("Cálculo e comportamento da Média Anual na Projeção Financeira de Renovações", () => {
    const baseRenewedPlayer: Players = {
      ...dummySoldPlayerWithClauses,
      id: "p_media_anual",
      name: "Erling Haaland",
      salary: 700000,
      contractTime: 6,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          isRenewal: true,
          seasonId: "season-1",
          salary: 700000,
          contractTime: 6,
          contractUntil: "30/06/2030",
          bonuses: [
            {
              id: "b_5m_1",
              category: "performance",
              name: "30 Gols na temporada",
              value: 5000000,
              partnerClub: "",
              status: "pending",
              direction: "payable",
            },
            {
              id: "b_5m_2",
              category: "objective",
              name: "Vencer a Champions League",
              value: 5000000,
              partnerClub: "",
              status: "pending",
              direction: "payable",
            },
            {
              id: "b_5m_3",
              category: "award",
              name: "Bola de Ouro",
              value: 5000000,
              partnerClub: "",
              status: "pending",
              direction: "payable",
            },
          ],
        },
      ],
    };

    const makeSeason = (
      playerObj: Players,
      sId = "season-1",
      sNum = 1,
    ): ClubData => ({
      id: sId,
      seasonNumber: sNum,
      players: [playerObj],
    });

    it("Cenário 1 — Nenhum bônus liquidado na temporada atual: Média Anual deve ser €36,4M", () => {
      render(
        <ManageClauses
          career={mockCareer}
          season={makeSeason(baseRenewedPlayer)}
          initialTab="renewals"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("Média Anual")).toBeTruthy();
      expect(screen.getByText(/€\s*36[.,]4M/)).toBeTruthy();
    });

    it("Cenário 2 — Um bônus de €5M liquidado na temporada atual: Média Anual deve ser €41,4M", () => {
      const playerWith1Paid: Players = JSON.parse(
        JSON.stringify(baseRenewedPlayer),
      );
      playerWith1Paid.contract[0].bonuses![0].status = "paid";
      playerWith1Paid.contract[0].bonuses![0].paid = true;
      playerWith1Paid.contract[0].bonuses![0].paidSeasonId = "season-1";

      render(
        <ManageClauses
          career={mockCareer}
          season={makeSeason(playerWith1Paid)}
          initialTab="renewals"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/€\s*41[.,]4M/)).toBeTruthy();
    });

    it("Cenário 3 — Dois bônus de €5M liquidados na mesma temporada: Média Anual deve ser €46,4M", () => {
      const playerWith2Paid: Players = JSON.parse(
        JSON.stringify(baseRenewedPlayer),
      );
      playerWith2Paid.contract[0].bonuses![0].status = "paid";
      playerWith2Paid.contract[0].bonuses![0].paid = true;
      playerWith2Paid.contract[0].bonuses![0].paidSeasonId = "season-1";
      playerWith2Paid.contract[0].bonuses![1].status = "paid";
      playerWith2Paid.contract[0].bonuses![1].paid = true;
      playerWith2Paid.contract[0].bonuses![1].paidSeasonId = "season-1";

      render(
        <ManageClauses
          career={mockCareer}
          season={makeSeason(playerWith2Paid)}
          initialTab="renewals"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/€\s*46[.,]4M/)).toBeTruthy();
    });

    it("Cenário 4 — Três bônus de €5M liquidados na mesma temporada: Média Anual deve ser €51,4M", () => {
      const playerWith3Paid: Players = JSON.parse(
        JSON.stringify(baseRenewedPlayer),
      );
      playerWith3Paid.contract[0].bonuses![0].status = "paid";
      playerWith3Paid.contract[0].bonuses![0].paid = true;
      playerWith3Paid.contract[0].bonuses![0].paidSeasonId = "season-1";
      playerWith3Paid.contract[0].bonuses![1].status = "paid";
      playerWith3Paid.contract[0].bonuses![1].paid = true;
      playerWith3Paid.contract[0].bonuses![1].paidSeasonId = "season-1";
      playerWith3Paid.contract[0].bonuses![2].status = "paid";
      playerWith3Paid.contract[0].bonuses![2].paid = true;
      playerWith3Paid.contract[0].bonuses![2].paidSeasonId = "season-1";

      render(
        <ManageClauses
          career={mockCareer}
          season={makeSeason(playerWith3Paid)}
          initialTab="renewals"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/€\s*51[.,]4M/)).toBeTruthy();
    });

    it("Cenário 5 — Temporada seguinte (Season 2): bônus liquidados na temporada anterior não compõem a nova temporada (€36,4M)", () => {
      const playerFromSeason1: Players = JSON.parse(
        JSON.stringify(baseRenewedPlayer),
      );
      playerFromSeason1.contract[0].bonuses![0].status = "paid";
      playerFromSeason1.contract[0].bonuses![0].paid = true;
      playerFromSeason1.contract[0].bonuses![0].paidSeasonId = "season-1";
      playerFromSeason1.contract[0].bonuses![0].paidSeasonNumber = 1;

      render(
        <ManageClauses
          career={mockCareer}
          season={makeSeason(playerFromSeason1, "season-2", 2)}
          initialTab="renewals"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/€\s*36[.,]4M/)).toBeTruthy();
    });

    it("Garante que bônus com meta atingida mas status pendente não altera a Média Anual (€36,4M)", () => {
      const playerWithPendingAchieved: Players = JSON.parse(
        JSON.stringify(baseRenewedPlayer),
      );
      playerWithPendingAchieved.contract[0].bonuses![0].status = "pending";
      playerWithPendingAchieved.contract[0].bonuses![0].paid = false;
      playerWithPendingAchieved.contract[0].bonuses![0].currentMetricProgress = 35;
      playerWithPendingAchieved.contract[0].bonuses![0].metricTarget = 30;

      render(
        <ManageClauses
          career={mockCareer}
          season={makeSeason(playerWithPendingAchieved)}
          initialTab="renewals"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/€\s*36[.,]4M/)).toBeTruthy();
    });

    it("Garante que o mesmo bônus duplicado na lista não é somado duas vezes", () => {
      const playerWithDuplicate: Players = JSON.parse(
        JSON.stringify(baseRenewedPlayer),
      );
      const paidBonus = {
        ...playerWithDuplicate.contract[0].bonuses![0],
        status: "paid" as const,
        paid: true,
        paidSeasonId: "season-1",
      };
      playerWithDuplicate.contract[0].bonuses = [paidBonus, { ...paidBonus }];

      render(
        <ManageClauses
          career={mockCareer}
          season={makeSeason(playerWithDuplicate)}
          initialTab="renewals"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/€\s*41[.,]4M/)).toBeTruthy();
    });

    it("Atualiza a Média Anual reativamente ao liquidar um bônus pelo painel de gerenciamento", async () => {
      vi.spyOn(PlayersContractService, "settleBonus").mockResolvedValue(
        undefined,
      );

      render(
        <ManageClauses
          career={mockCareer}
          season={makeSeason(baseRenewedPlayer)}
          initialTab="renewals"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/€\s*36[.,]4M/)).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

      const settleButtons = screen.getAllByRole("button", {
        name: /Liquidar Bônus/i,
      });
      fireEvent.click(settleButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Liquidado/i)).toBeTruthy();
      });

      // Volta para a lista e verifica a Média Anual atualizada no card
      fireEvent.click(
        screen.getByRole("button", { name: /Voltar para a lista/i }),
      );

      await waitFor(() => {
        expect(screen.getByText(/€\s*41[.,]4M/)).toBeTruthy();
      });
    });
  });

  describe("Filtro Estrito da Aba Chegadas (arrivals) em ManageClauses", () => {
    it("isContractedArrivalTransfer ignora base, fim de empréstimo e registros inválidos", () => {
      // Base
      expect(
        isContractedArrivalTransfer(
          { buy: false, incomingLoan: false } as unknown as Players,
          { fromClub: "Base", buyValue: 0 } as unknown as Contract,
          0,
          mockCareer,
          1,
        ),
      ).toBe(false);

      // Clube de origem vazio (elenco inicial sem histórico de transferência)
      expect(
        isContractedArrivalTransfer(
          { buy: false, incomingLoan: false } as unknown as Players,
          { fromClub: "", buyValue: 0 } as unknown as Contract,
          0,
          mockCareer,
          1,
        ),
      ).toBe(false);

      // Renovação
      expect(
        isContractedArrivalTransfer(
          { buy: true } as unknown as Players,
          { fromClub: "Rennes", isRenewal: true } as unknown as Contract,
          0,
          mockCareer,
          1,
        ),
      ).toBe(false);

      // Compra legítima
      expect(
        isContractedArrivalTransfer(
          { buy: true, incomingLoan: false } as unknown as Players,
          { fromClub: "Rennes", buyValue: 30000000 } as unknown as Contract,
          0,
          mockCareer,
          1,
        ),
      ).toBe(true);

      // Empréstimo de chegada
      expect(
        isContractedArrivalTransfer(
          { buy: false, incomingLoan: true } as unknown as Players,
          {
            fromClub: "Chelsea",
            buyValue: 0,
            isLoan: true,
          } as unknown as Contract,
          0,
          mockCareer,
          1,
        ),
      ).toBe(true);
    });

    it("hasArrivalActiveClauses valida presença de bônus a pagar, parcelas a pagar ou opção de compra em empréstimo", () => {
      expect(hasArrivalActiveClauses({} as unknown as Contract)).toBe(false);

      // Bônus a pagar pendente
      expect(
        hasArrivalActiveClauses({
          bonuses: [
            {
              id: "b1",
              direction: "payable",
              status: "pending",
              value: 1000,
            },
          ] as unknown as TransferBonus[],
        } as unknown as Contract),
      ).toBe(true);

      // Parcelas a pagar pendentes
      expect(
        hasArrivalActiveClauses({
          installments: {
            direction: "payable",
            remainingInstallments: 2,
            status: "pending",
          },
        } as unknown as Contract),
      ).toBe(true);

      // Empréstimo com opção de compra pendente
      expect(
        hasArrivalActiveClauses({
          isLoan: true,
          buyOptionValue: 15000000,
          loanTerms: {
            hasBuyOption: true,
            buyOptionFee: 15000000,
            buyOptionExercised: false,
          },
        } as unknown as Contract),
      ).toBe(true);

      // Cláusula especial de recompra
      expect(
        hasArrivalActiveClauses({
          transferClauses: {
            buybackValue: 50000000,
          },
        } as unknown as Contract),
      ).toBe(true);
    });

    it("filtra na UI do ManageClauses apenas chegadas reais com cláusulas ativas", () => {
      const basePlayer: Players = {
        ...dummyBoughtPlayer,
        id: "p-base",
        name: "Garoto da Base",
        buy: false,
        incomingLoan: false,
        contract: [
          {
            fromClub: "Base",
            buyValue: 0,
            bonuses: [
              { id: "b-base", name: "Meta", value: 1000, status: "pending" },
            ] as unknown as TransferBonus[],
          } as unknown as Contract,
        ],
      };

      const loanReturnPlayer: Players = {
        ...dummyBoughtPlayer,
        id: "p-return",
        name: "Volta de Empréstimo",
        buy: false,
        incomingLoan: false,
        contract: [
          {
            fromClub: "Fim de Empréstimo",
            buyValue: 0,
            bonuses: [
              { id: "b-ret", name: "Meta", value: 1000, status: "pending" },
            ] as unknown as TransferBonus[],
          } as unknown as Contract,
        ],
      };

      const initialSquadPlayer: Players = {
        ...dummyBoughtPlayer,
        id: "p-initial",
        name: "Veterano do Clube",
        buy: false,
        incomingLoan: false,
        contract: [
          {
            fromClub: "Real Madrid",
            buyValue: 0,
          } as unknown as Contract,
        ],
      };

      const legitArrivalPlayer: Players = {
        ...dummyBoughtPlayer,
        id: "p-legit",
        name: "Eduardo Camavinga",
        buy: true,
        incomingLoan: false,
        contract: [
          {
            fromClub: "Rennes",
            buyValue: 30000000,
            bonuses: [
              {
                id: "b-camavinga",
                name: "Campeão Nacional",
                value: 5000000,
                status: "pending",
              },
            ] as unknown as TransferBonus[],
          } as unknown as Contract,
        ],
      };

      const testSeason: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [
          basePlayer,
          loanReturnPlayer,
          initialSquadPlayer,
          legitArrivalPlayer,
        ],
      };

      render(
        <ManageClauses
          career={mockCareer}
          season={testSeason}
          initialTab="arrivals"
          onClose={vi.fn()}
        />,
      );

      // Eduardo Camavinga deve ser exibido
      expect(screen.getByText("Eduardo Camavinga")).toBeDefined();

      // Jogadores da base, volta de empréstimo e elenco inicial não devem ser exibidos
      expect(screen.queryByText("Garoto da Base")).toBeNull();
      expect(screen.queryByText("Volta de Empréstimo")).toBeNull();
      expect(screen.queryByText("Veterano do Clube")).toBeNull();
    });
  });

  describe("Identificação Clara do Destinatário da Cláusula (Pagar ao Jogador vs Pagar ao Clube)", () => {
    it("ModularClausesGrid exibe claramente quais cláusulas são para pagar ao jogador e quais para o clube", () => {
      cleanup();
      render(
        <ModularClausesGrid
          mode="transfer"
          direction="exit"
          formValues={
            {
              sellValue: "50000000",
              installmentsPercentage: "30",
              installmentsYears: "3",
            } as unknown as Parameters<
              typeof ModularClausesGrid
            >[0]["formValues"]
          }
          booleanValues={
            {
              hasInstallments: true,
              hasPlayerSwap: false,
              hasBonus: false,
              hasOtherClauses: false,
              firstRefusal: false,
            } as unknown as Parameters<
              typeof ModularClausesGrid
            >[0]["booleanValues"]
          }
          bonuses={[]}
          currency="EUR"
          onOpenBonus={vi.fn()}
          onOpenOtherClauses={vi.fn()}
        />,
      );

      // Em saída, parcelamento é a receber do clube
      expect(
        screen.getAllByText("A Receber do Clube").length,
      ).toBeGreaterThanOrEqual(1);
    });

    it("ModularClausesGrid em renovação exibe distintivo 'A Pagar ao Jogador'", () => {
      cleanup();
      render(
        <ModularClausesGrid
          mode="renewal"
          direction="renewals"
          formValues={
            {
              salary: "150k",
              releaseClause: "80M",
            } as unknown as Parameters<
              typeof ModularClausesGrid
            >[0]["formValues"]
          }
          bonuses={[]}
          currency="EUR"
          onOpenContract={vi.fn()}
          onOpenBonus={vi.fn()}
          onOpenOtherClauses={vi.fn()}
        />,
      );

      const playerBadges = screen.getAllByText("A Pagar ao Jogador");
      expect(playerBadges.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Contrato do Jogador")).toBeDefined();
    });

    it("ClauseOperationalManageView exibe distintivos específicos para jogador e clube", () => {
      cleanup();
      const testItem = {
        cardKey: "test-item-key",
        direction: "arrivals" as const,
        contractIndex: 0,
        player: {
          id: "p-op-test",
          name: "Vinicius Jr",
          salary: 300000,
          contract: [
            {
              buyValue: 45000000,
              fromClub: "Flamengo",
              dataArrival: new Date(),
              contractDetails: {
                releaseClause: 1000000000,
                wageAdjustment: {
                  direction: "Aumentar",
                  percentage: 15,
                  targetObjective: "Artilharia",
                  status: "pending",
                },
              },
              installments: {
                direction: "payable" as const,
                totalInstallments: 3,
                remainingInstallments: 2,
                annualInstallmentValue: 15000000,
                status: "pending",
              },
              transferClauses: {
                buybackValue: 120000000,
              },
            },
          ],
        } as unknown as Players,
        contract: {
          buyValue: 45000000,
          fromClub: "Flamengo",
          dataArrival: new Date(),
          releaseClause: 1000000000,
          installments: {
            direction: "payable" as const,
            totalInstallments: 3,
            remainingInstallments: 2,
            annualInstallmentValue: 15000000,
            status: "pending" as const,
          },
          transferClauses: {
            buybackValue: 120000000,
          },
        } as unknown as Contract,
      };

      render(
        <ClauseOperationalManageView
          career={mockCareer}
          activeTransferItem={
            testItem as unknown as Parameters<
              typeof ClauseOperationalManageView
            >[0]["activeTransferItem"]
          }
          isLoading={false}
          cancelInline={vi.fn()}
          sellOnActiveCardKey={null}
          setSellOnActiveCardKey={vi.fn()}
          sellOnTotalInput=""
          setSellOnTotalInput={vi.fn()}
          sellOnDateInput=""
          setSellOnDateInput={vi.fn()}
          loanBuyOptionDateInput=""
          setLoanBuyOptionDateInput={vi.fn()}
          handleApplyWageAdjustment={vi.fn()}
          handleSettleInstallment={vi.fn()}
          handleUnsettleInstallment={vi.fn()}
          handleSettleBonus={vi.fn()}
          handleExerciseBuyback={vi.fn()}
          handleExerciseFirstRefusal={vi.fn()}
          handleTriggerReleaseClause={vi.fn()}
          handleConfirmSellOn={vi.fn()}
          handleExerciseLoanBuyOption={vi.fn()}
        />,
      );

      // Parcelamento a pagar ao clube vendedor
      expect(screen.getByText("A Pagar ao Clube Vendedor")).toBeDefined();

      // Acordos especiais com o clube vendedor
      expect(screen.getByText("Acordos com Clube Vendedor")).toBeDefined();

      // Multa rescisória do contrato do jogador
      expect(screen.getByText("Contrato do Jogador")).toBeDefined();
    });

    it("ModularClausesGrid em chegadas exibe 6 cards operacionais (4 para o clube vendedor e 2 para o jogador)", () => {
      cleanup();
      render(
        <ModularClausesGrid
          mode="transfer"
          direction="arrivals"
          formValues={
            {
              buyValue: "50M",
              installmentsPercentage: "40",
              installmentsYears: "3",
              swapPlayerName: "Ganso",
              swapPlayerPosition: "MEI",
              swapPlayerValue: "5M",
              buybackValue: "80M",
              releaseClause: "120M",
              wageAdjustmentType: "Aumentar",
              wageAdjustmentPercentage: "10%",
            } as unknown as Parameters<
              typeof ModularClausesGrid
            >[0]["formValues"]
          }
          booleanValues={
            {
              hasInstallments: true,
              hasPlayerSwap: true,
              hasBonus: true,
              hasOtherClauses: true,
              firstRefusal: false,
            } as unknown as Parameters<
              typeof ModularClausesGrid
            >[0]["booleanValues"]
          }
          bonuses={[
            {
              id: "b-club",
              name: "Título Nacional",
              value: 2000000,
              partnerClub: "Santos",
              status: "pending",
              direction: "payable",
              category: "objective",
            },
            {
              id: "b-player",
              name: "20 Gols marcados",
              value: 500000,
              status: "pending",
              direction: "payable",
              category: "performance",
            },
          ]}
          currency="EUR"
          onOpenInstallments={vi.fn()}
          onOpenPlayerSwap={vi.fn()}
          onOpenBonus={vi.fn()}
          onOpenOtherClauses={vi.fn()}
          onOpenPlayerBonus={vi.fn()}
          onOpenPlayerOtherClauses={vi.fn()}
        />,
      );

      // Distintivo do cabeçalho indicando os 6 módulos
      expect(
        screen.getByText(
          "6 Módulos Operacionais (4 Clube Vendedor • 2 Jogador)",
        ),
      ).toBeDefined();

      // Os 4 cards do Clube Vendedor
      expect(screen.getByText("1. Parcelamento")).toBeDefined();
      expect(screen.getByText("2. Atleta de Troca")).toBeDefined();
      expect(screen.getByText("3. Bônus & Metas (Clube)")).toBeDefined();
      expect(screen.getByText("4. Cláusulas Especiais (Clube)")).toBeDefined();

      // Os 2 cards do Jogador
      expect(screen.getByText("5. Bônus & Metas (Jogador)")).toBeDefined();
      expect(
        screen.getByText("6. Cláusulas Especiais (Jogador)"),
      ).toBeDefined();

      // Distintivos indicativos de destinatário
      expect(
        screen.getAllByText("A Pagar ao Clube Vendedor").length,
      ).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("A Entregar ao Clube Vendedor")).toBeDefined();
      expect(screen.getByText("Acordo com Clube Vendedor")).toBeDefined();
      expect(
        screen.getAllByText("A Pagar ao Jogador").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Contrato do Jogador")).toBeDefined();
    });

    it("não renderiza botão 'Ativar Venda Futura' para chegadas/renovações e exibe tag informativa", () => {
      const playerInClub: Players = {
        id: "p_lamine",
        name: "Lamine Yamal",
        overall: 85,
        sector: "Ataque",
        position: "PD",
        age: 17,
        salary: 100000,
        nation: "Espanha",
        shirtNumber: "19",
        playerValue: 120000000,
        buy: true,
        captain: false,
        sell: false,
        contractTime: 5,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "FC Barcelona",
            leftClub: "",
            dataArrival: new Date("2024-07-01"),
            transferClauses: {
              sellOnPercentage: 15,
            },
          },
        ],
      };

      const arrivalItem: TransferItem = {
        player: playerInClub,
        contract: playerInClub.contract![0],
        contractIndex: 0,
        direction: "arrivals",
        cardKey: "p_lamine_0_arrivals",
      };

      render(
        <ClauseOperationalManageView
          career={mockCareer}
          activeTransferItem={arrivalItem}
          isLoading={false}
          cancelInline={vi.fn()}
          sellOnActiveCardKey={null}
          setSellOnActiveCardKey={vi.fn()}
          sellOnTotalInput=""
          setSellOnTotalInput={vi.fn()}
          sellOnDateInput=""
          setSellOnDateInput={vi.fn()}
          loanBuyOptionDateInput=""
          setLoanBuyOptionDateInput={vi.fn()}
          handleApplyWageAdjustment={vi.fn()}
          handleSettleInstallment={vi.fn()}
          handleUnsettleInstallment={vi.fn()}
          handleSettleBonus={vi.fn()}
          handleExerciseBuyback={vi.fn()}
          handleExerciseFirstRefusal={vi.fn()}
          handleTriggerReleaseClause={vi.fn()}
          handleConfirmSellOn={vi.fn()}
          handleExerciseLoanBuyOption={vi.fn()}
        />,
      );

      // Deve mostrar o percentual e a tag informativa de automática na venda
      expect(screen.getByText(/Revenda Futura:/i)).toBeDefined();
      expect(screen.getByText(/15%/i)).toBeDefined();
      expect(screen.getByText(/\(Automática na venda\)/i)).toBeDefined();

      // NÃO deve exibir o botão manual de ativar venda futura
      expect(screen.queryByTestId("btn-toggle-sellon")).toBeNull();
    });

    it("renderiza botão de edição rápida na .clubSection do TransferClauseCard e aciona onOpenScreen", () => {
      const onOpenScreen = vi.fn();
      const testPlayer: Players = {
        id: "p_pedri",
        name: "Pedri",
        overall: 88,
        sector: "Meio-Campo",
        position: "MC",
        age: 22,
        salary: 150000,
        nation: "Espanha",
        shirtNumber: "8",
        playerValue: 100000000,
        buy: true,
        captain: false,
        sell: false,
        contractTime: 4,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 20000000,
            sellValue: 0,
            fromClub: "Las Palmas",
            leftClub: "",
            dataArrival: new Date("2024-07-01"),
            transferClauses: {
              sellOnPercentage: 10,
            },
          },
        ],
      };

      const item: TransferItem = {
        player: testPlayer,
        contract: testPlayer.contract![0],
        contractIndex: 0,
        direction: "arrivals",
        cardKey: "p_pedri_0_arrivals",
      };

      render(
        <TransferClauseCard
          item={item}
          isDetailView={false}
          career={mockCareer}
          season={
            {
              id: "season-1",
              seasonNumber: 1,
              players: [testPlayer],
              matches: [],
            } as unknown as ClubData
          }
          clubColor="#004d98"
          readOnly={false}
          activeInline={null}
          highlightedCardKey={null}
          getClubBadgeUrl={() => undefined}
          startEditCard={vi.fn()}
          startManageCard={vi.fn()}
          cancelInline={vi.fn()}
          handleDeleteRenewal={vi.fn()}
          handleRevertTransfer={vi.fn()}
          onOpenScreen={onOpenScreen}
        />,
      );

      const editBtn = screen.getByTestId("btn-edit-club-transfer");
      expect(editBtn).toBeDefined();

      fireEvent.click(editBtn);

      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "addTransferPlayer",
        seasonId: "season-1",
        editTransfer: {
          player: testPlayer,
          contract: testPlayer.contract![0],
          contractIndex: 0,
        },
        returnToScreen: {
          key: "manageClauses",
          initialTab: "arrivals",
        },
      });
    });

    it("renderiza iniciais do clube parceiro em TransferClauseCard quando escudo não é encontrado", () => {
      const testPlayer: Players = {
        id: "p_gavi",
        name: "Gavi",
        overall: 86,
        sector: "Meio-Campo",
        position: "MC",
        age: 20,
        salary: 120000,
        nation: "Espanha",
        shirtNumber: "6",
        playerValue: 90000000,
        buy: false,
        captain: false,
        sell: true,
        contractTime: 3,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 0,
            sellValue: 50000000,
            fromClub: "FC Barcelona",
            leftClub: "Real Betis Balompie",
            dataArrival: null,
            dataExit: new Date("2024-07-01"),
            transferClauses: {
              sellOnPercentage: 20,
            },
          },
        ],
      };

      const item: TransferItem = {
        player: testPlayer,
        contract: testPlayer.contract![0],
        contractIndex: 0,
        direction: "exit",
        cardKey: "p_gavi_0_exit",
      };

      render(
        <TransferClauseCard
          item={item}
          isDetailView={false}
          career={mockCareer}
          season={
            {
              id: "season-1",
              seasonNumber: 1,
              players: [testPlayer],
              matches: [],
            } as unknown as ClubData
          }
          clubColor="#004d98"
          readOnly={false}
          activeInline={null}
          highlightedCardKey={null}
          getClubBadgeUrl={() => undefined}
          startEditCard={vi.fn()}
          startManageCard={vi.fn()}
          cancelInline={vi.fn()}
          handleDeleteRenewal={vi.fn()}
          handleRevertTransfer={vi.fn()}
        />,
      );

      // Iniciais de Real Betis Balompie -> RBB
      expect(screen.getByText("RBB")).toBeDefined();
    });
  });

  describe("Navegação Navbar na Tela de Cláusulas (Fixação, Scroll to Top e Reset de Scrolls)", () => {
    it("o Navbar é renderizado sem wrappers obstrutivos e ao clicar em uma opção executa scroll to top e reseta scroll", () => {
      const scrollToSpy = vi
        .spyOn(window, "scrollTo")
        .mockImplementation(() => {});

      render(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      // 1. O elemento nav existe diretamente no DOM e não está encapsulado em um navbarWrapper obstrutivo
      const navElement = screen.getByRole("navigation");
      expect(navElement).toBeDefined();
      expect(navElement.parentElement?.className).not.toContain(
        "navbarWrapper",
      );

      // 2. Ao clicar na opção 'Chegadas (1)' do Navbar
      const arrivalsTab = screen.getByText(/Chegadas \(1\)/i);
      fireEvent.click(arrivalsTab);

      // Deve subir a tela via scrollTo top: 0 suave
      expect(scrollToSpy).toHaveBeenCalledWith(
        expect.objectContaining({ top: 0, behavior: "smooth" }),
      );

      // 3. Ao clicar na opção 'Saídas (2)' do Navbar
      scrollToSpy.mockClear();
      const exitTab = screen.getByText(/Saídas \(2\)/i);
      fireEvent.click(exitTab);

      // Deve subir a tela novamente
      expect(scrollToSpy).toHaveBeenCalledWith(
        expect.objectContaining({ top: 0, behavior: "smooth" }),
      );

      scrollToSpy.mockRestore();
    });

    it("integra o Navbar com Swiper carousel com 3 slides e animação de transição entre abas", () => {
      const scrollToSpy = vi
        .spyOn(window, "scrollTo")
        .mockImplementation(() => {});

      const { container } = render(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      // 1. Swiper renderiza 3 slides correspondentes às 3 abas de cláusulas
      const slides = container.querySelectorAll(".swiper-slide");
      expect(slides.length).toBe(3);

      // 2. Os containers dos slides possuem os identificadores de abas
      expect(screen.getByTestId("clauses-tab-renewals")).toBeDefined();
      expect(screen.getByTestId("clauses-tab-arrivals")).toBeDefined();
      expect(screen.getByTestId("clauses-tab-exit")).toBeDefined();

      // 3. Ao navegar via Navbar, ativa o slide de Chegadas
      fireEvent.click(screen.getByText(/Chegadas \(1\)/i));
      const arrivalsSlide = screen.getByTestId("clauses-tab-arrivals");
      expect(within(arrivalsSlide).getByText("Kylian Mbappé")).toBeDefined();

      // 4. Ao navegar via Navbar para Saídas, ativa o slide de Saídas
      fireEvent.click(screen.getByText(/Saídas \(2\)/i));
      const exitSlide = screen.getByTestId("clauses-tab-exit");
      expect(within(exitSlide).getByText("Rodrygo Goes")).toBeDefined();

      scrollToSpy.mockRestore();
    });

    it("clicar no Navbar dispara scrollTo suave uma única vez sem zerar documentElement.scrollTop sincronamente", () => {
      const scrollToSpy = vi
        .spyOn(window, "scrollTo")
        .mockImplementation(() => {});

      Object.defineProperty(document.documentElement, "scrollTop", {
        value: 350,
        writable: true,
        configurable: true,
      });

      render(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      scrollToSpy.mockClear();
      fireEvent.click(screen.getByText(/Chegadas \(1\)/i));

      expect(scrollToSpy).toHaveBeenCalledTimes(1);
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
      expect(document.documentElement.scrollTop).toBe(350);

      scrollToSpy.mockRestore();
    });

    it("selecionar um atleta do FC Barcelona no SearchableSelect invoca scrollIntoView com block='start' no card correspondente", () => {
      const barcaCareer: Career = {
        ...mockCareer,
        clubName: "FC Barcelona",
      };
      const pedriPlayer: Players = {
        ...dummyBoughtPlayer,
        id: "p_pedri_search",
        name: "Pedri González",
      };
      const barcaSeason: ClubData = {
        ...mockSeason,
        players: [pedriPlayer],
      };

      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      render(
        <ManageClauses
          career={barcaCareer}
          season={barcaSeason}
          initialTab="arrivals"
          onClose={vi.fn()}
        />,
      );

      const searchInput = screen.getByPlaceholderText(
        "Pesquisar jogador em chegadas...",
      );
      fireEvent.change(searchInput, { target: { value: "Pedri González" } });

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
    });

    it("ao editar cláusulas em ManageClauses de jogador contratado em temporada passada, passa preserveTransferDate=true e mantém data original", async () => {
      const editTransferSpy = vi
        .spyOn(PlayersContractService, "editTransferInSeason")
        .mockResolvedValue(undefined);

      const originalArrival = new Date(2025, 6, 15); // 15/07/2025 (Temporada 1)
      const pastArrivalPlayer: Players = {
        ...dummyBoughtPlayer,
        id: "p_olmo_past",
        name: "Dani Olmo",
        buy: false,
        contract: [
          {
            buyValue: 55_000_000,
            sellValue: 0,
            fromClub: "RB Leipzig",
            leftClub: "",
            dataArrival: originalArrival,
            dataExit: null,
            bonuses: [
              {
                id: "b_past_1",
                direction: "payable",
                category: "objective",
                bonusCategory: "Objetivo atingido",
                name: "Ser campeão",
                targetObjective: "Ser campeão",
                targetLeague: "LaLiga",
                partnerClub: "RB Leipzig",
                value: 3_000_000,
                status: "pending",
              },
            ],
          },
        ],
      };

      const barcaCareerS2: Career = {
        ...mockCareer,
        clubName: "FC Barcelona",
        nation: "Espanha",
        createdAt: new Date("2025-07-01"),
      };
      const season2: ClubData = {
        ...mockSeason,
        id: "season-2",
        seasonNumber: 2,
        players: [pastArrivalPlayer],
      };

      render(
        <ManageClauses
          career={barcaCareerS2}
          season={season2}
          initialTab="arrivals"
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Editar/i }));
      fireEvent.click(screen.getByTestId("btn-choose-club-clauses"));
      fireEvent.click(screen.getByText("Salvar Cláusulas"));

      await waitFor(() => {
        expect(editTransferSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            playerId: "p_olmo_past",
            seasonId: "season-2",
            preserveTransferDate: true,
          }),
        );
      });
      expect(pastArrivalPlayer.contract![0].dataArrival).toEqual(originalArrival);
    });
  });
});
