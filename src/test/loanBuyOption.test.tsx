// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import React from "react";
import ManageClauses from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { validateLoan } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/validators/loanValidator";
import {
  applyEditToCareer,
  applyRevertToCareer,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/helpers/transferCareerStateReducers";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";

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

describe("Loan with Buy Option (Empréstimo com Opção de Compra)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockCareer: Career = {
    id: "c1",
    clubName: "Real Madrid",
    managerName: "Ancelotti",
    createdAt: new Date("2024-07-01"),
    teamBadge: "",
    nation: "ESP",
    currency: "EUR",
    colorsTeams: ["#3b82f6"],
    trophies: [],
    clubData: [],
  };

  const dummyLoanPlayerWithBuyOption: Players = {
    id: "p-loan-1",
    name: "Arda Güler",
    position: "MC",
    shirtNumber: "15",
    age: 19,
    nation: "TUR",
    salary: 50000,
    playerValue: 20000000,
    buy: false,
    captain: false,
    sell: false,
    loan: true,
    contractTime: 0,
    ballonDor: 0,
    overall: 80,
    sector: "Meia",
    statsLeagues: [],
    contract: [
      {
        buyValue: 0,
        sellValue: 0,
        fromClub: "",
        leftClub: "Real Sociedad",
        dataArrival: null,
        dataExit: new Date("2024-07-15"),
        isLoan: true,
        loanDuration: 1,
        wagePercentage: 50,
        buyOptionValue: 15000000,
        loanTerms: {
          durationYears: 1,
          ourWagePercentage: 50,
          theirWagePercentage: 50,
          hasBuyOption: true,
          buyOptionFee: 15000000,
          sellOnPercentage: 10,
          partnerClub: "Real Sociedad",
        },
      },
    ],
  };

  const dummyStandardLoanPlayer: Players = {
    id: "p-loan-standard",
    name: "Nico Paz",
    position: "MC",
    shirtNumber: "28",
    age: 19,
    nation: "ARG",
    salary: 30000,
    playerValue: 10000000,
    buy: false,
    captain: false,
    sell: false,
    loan: true,
    contractTime: 0,
    ballonDor: 0,
    overall: 74,
    sector: "Meia",
    statsLeagues: [],
    contract: [
      {
        buyValue: 0,
        sellValue: 0,
        fromClub: "",
        leftClub: "Como",
        dataArrival: null,
        dataExit: new Date("2024-07-20"),
        isLoan: true,
        loanDuration: 1,
        wagePercentage: 50,
      },
    ],
  };

  describe("Validação do formulário de empréstimo (validateLoan)", () => {
    it("valida com sucesso empréstimo simples sem opção de compra", () => {
      const result = validateLoan(
        {
          dateExit: "15/07",
          toClub: "Real Sociedad",
          loanDuration: "1",
          wagePercentage: "50",
        },
        {
          hasBuyOption: false,
        },
      );

      expect(result.isValid).toBe(true);
      expect(result.data?.loanTerms).toBeUndefined();
    });

    it("falha quando opção de compra está ativa mas valor não foi preenchido", () => {
      const result = validateLoan(
        {
          dateExit: "15/07",
          toClub: "Real Sociedad",
          loanDuration: "1",
          wagePercentage: "50",
          buyOption: "",
        },
        {
          hasBuyOption: true,
        },
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/taxa de transferência/i);
    });

    it("falha quando opção de compra tem formato inválido (sem k, m ou b)", () => {
      const result = validateLoan(
        {
          dateExit: "15/07",
          toClub: "Real Sociedad",
          loanDuration: "1",
          wagePercentage: "50",
          buyOption: "15000",
        },
        {
          hasBuyOption: true,
        },
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/deve terminar com 'k', 'm' ou 'b'/i);
    });

    it("falha quando cláusula de futura venda tem porcentagem fora de 1..100", () => {
      const result = validateLoan(
        {
          dateExit: "15/07",
          toClub: "Real Sociedad",
          loanDuration: "1",
          wagePercentage: "50",
          buyOption: "15m",
          sellOnPercentage: "150",
        },
        {
          hasBuyOption: true,
        },
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/entre 1 e 100/i);
    });

    it("valida com sucesso e constrói LoanTerms com opção de compra e futura venda", () => {
      const result = validateLoan(
        {
          dateExit: "15/07",
          toClub: "Real Sociedad",
          loanDuration: "1",
          wagePercentage: "50",
          buyOption: "15m",
          sellOnPercentage: "10",
        },
        {
          hasBuyOption: true,
        },
      );

      expect(result.isValid).toBe(true);
      expect(result.data?.loanTerms).toBeDefined();
      expect(result.data?.loanTerms?.hasBuyOption).toBe(true);
      expect(result.data?.loanTerms?.buyOptionFee).toBe(15000000);
      expect(result.data?.loanTerms?.sellOnPercentage).toBe(10);
      expect(result.data?.loanTerms?.partnerClub).toBe("Real Sociedad");
    });
  });

  describe("ManageClauses (Saídas) para Empréstimo com Opção de Compra", () => {
    it("empréstimos com e sem opção de compra aparecem na aba 'Saídas'", () => {
      const mockSeason: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [dummyLoanPlayerWithBuyOption, dummyStandardLoanPlayer],
      };

      render(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText(/Saídas/));

      // Deve encontrar Arda Güler
      expect(screen.getByText("Arda Güler")).toBeTruthy();
      // Deve encontrar também Nico Paz (empréstimo de saída visível em Saídas)
      expect(screen.getByText("Nico Paz")).toBeTruthy();
    });

    it("card de empréstimo exibe valor da opção e APENAS botão 'Gerenciar' (sem 'Editar' ou '+ Adicionar Cláusulas')", () => {
      const mockSeason: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [dummyLoanPlayerWithBuyOption],
      };

      render(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText(/Saídas/));

      // Exibe valor total da opção de compra (15M)
      expect(screen.getAllByText(/15M/i).length).toBeGreaterThan(0);

      // Botão Gerenciar deve estar visível
      expect(screen.getByRole("button", { name: /Gerenciar/i })).toBeTruthy();

      // NUNCA deve ter botão Editar
      expect(screen.queryByRole("button", { name: /Editar/i })).toBeNull();

      // NUNCA deve ter botão "+ Adicionar Cláusulas"
      expect(
        screen.queryByRole("button", { name: /\+ Adicionar Cláusulas/i }),
      ).toBeNull();
    });

    it("ao clicar em 'Gerenciar', exibe card operacional 'Opção de Compra' com botão 'Exercer Opção'", () => {
      const mockSeason: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [dummyLoanPlayerWithBuyOption],
      };

      render(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText(/Saídas/));
      fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

      // Deve exibir o card de Opção de Compra, mas o drawer lateral NÃO deve estar aberto
      expect(screen.getByText("Opção de Compra")).toBeTruthy();
      expect(screen.getByRole("button", { name: /Exercer Opção/i })).toBeTruthy();
      expect(screen.queryByTestId("loan-buy-option-activation-box")).toBeNull();
    });

    it("ao clicar em 'Exercer Opção', abre drawer lateral com campo de data vazio e executa exerciseLoanBuyOption", async () => {
      const exerciseSpy = vi
        .spyOn(PlayersContractService, "exerciseLoanBuyOption")
        .mockResolvedValueOnce(undefined);

      const mockSeason: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [dummyLoanPlayerWithBuyOption],
      };

      render(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText(/Saídas/));
      fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

      // Garante que antes de clicar no botão o drawer não está aberto
      expect(screen.queryByTestId("loan-buy-option-activation-box")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: /Exercer Opção/i }));

      // Drawer aberto
      expect(
        screen.getByRole("heading", { name: /Exercer Opção de Compra/i }),
      ).toBeTruthy();

      // Data de exercício inicialmente vazia
      const dateInput = screen.getByTestId("loan-buy-option-date-input") as HTMLInputElement;
      expect(dateInput.value).toBe("");

      // Confirmar botão desabilitado inicialmente
      const confirmBtn = screen.getByTestId(
        "btn-confirm-exercise-buy-option",
      ) as HTMLButtonElement;
      expect(confirmBtn.disabled).toBe(true);

      // Digita a data válida
      fireEvent.change(dateInput, { target: { value: "25/08" } });
      expect(confirmBtn.disabled).toBe(false);

      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(exerciseSpy).toHaveBeenCalledWith(
          mockCareer.id,
          mockSeason.id,
          dummyLoanPlayerWithBuyOption.id,
          0,
          "25/08",
        );
      });
    });

    it("quando opção já foi exercida, exibe badge 'Exercida' e botão para alterar data no menu lateral", async () => {
      const exerciseSpy = vi
        .spyOn(PlayersContractService, "exerciseLoanBuyOption")
        .mockResolvedValueOnce(undefined);

      const exercisedPlayer: Players = {
        ...dummyLoanPlayerWithBuyOption,
        sell: true,
        loan: false,
        contract: [
          {
            ...dummyLoanPlayerWithBuyOption.contract![0],
            loanTerms: {
              ...dummyLoanPlayerWithBuyOption.contract![0].loanTerms!,
              buyOptionExercised: true,
              exercisedDate: "25/08",
            },
          },
        ],
      };

      const mockSeason: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [exercisedPlayer],
      };

      render(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText(/Saídas/));
      fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

      // Deve exibir o badge Exercida
      expect(screen.getByText(/Exercida/i)).toBeTruthy();

      // Não exibe o botão antigo de exercer
      expect(screen.queryByRole("button", { name: /Exercer Opção de Compra/i })).toBeNull();

      // Exibe o botão de alterar data
      const editDateBtn = screen.getByRole("button", {
        name: /Alterar Data do Exercício/i,
      });
      expect(editDateBtn).toBeTruthy();

      // Clica para alterar a data
      fireEvent.click(editDateBtn);

      // Drawer abre com título de alteração
      expect(
        screen.getByRole("heading", { name: /Alterar Data do Exercício/i }),
      ).toBeTruthy();

      // Campo de data vem preenchido com a data atual (25/08)
      const dateInput = screen.getByTestId(
        "loan-buy-option-date-input",
      ) as HTMLInputElement;
      expect(dateInput.value).toBe("25/08");

      // Altera a data para 30/08
      fireEvent.change(dateInput, { target: { value: "30/08" } });

      // Salva
      const saveBtn = screen.getByRole("button", { name: /Salvar Nova Data/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(exerciseSpy).toHaveBeenCalledWith(
          mockCareer.id,
          mockSeason.id,
          exercisedPlayer.id,
          0,
          "30/08",
        );
      });
    });
  });

  describe("applyEditToCareer e applyRevertToCareer com Opção de Compra", () => {
    it("sincroniza o contrato derivado de venda e mantém sell=true quando o empréstimo exercido é editado", () => {
      const exercisedPlayer: Players = {
        ...dummyLoanPlayerWithBuyOption,
        sell: true,
        loan: false,
        contract: [
          {
            ...dummyLoanPlayerWithBuyOption.contract![0],
            loanTerms: {
              ...dummyLoanPlayerWithBuyOption.contract![0].loanTerms!,
              buyOptionExercised: true,
              exercisedDate: "25/08",
            },
          },
          {
            buyValue: 0,
            sellValue: 15000000,
            leftClub: "Real Sociedad",
            fromClub: "",
            dataArrival: null,
            dataExit: new Date("2024-08-25"),
            isLoan: false,
            fromLoanBuyOption: true,
            sourceLoanContractIndex: 0,
            transferClauses: {
              sellOnPercentage: 10,
              partnerClub: "Real Sociedad",
              status: "pending",
            },
          },
        ],
      };

      const careerWithPlayer: Career = {
        ...mockCareer,
        clubData: [
          {
            id: "season-1",
            seasonNumber: 1,
            players: [exercisedPlayer],
          },
        ],
      };

      // Edita o empréstimo alterando a taxa de 15M para 18M e sell-on para 15%
      const updatedCareer = applyEditToCareer(
        careerWithPlayer,
        "season-1",
        exercisedPlayer.id,
        0,
        "exit",
        {
          clubName: "Real Sociedad",
          transferValue: 0,
          transferType: "Emprestar",
          date: new Date("2024-07-15"),
          loanDuration: 1,
          wagePercentage: 50,
          buyOptionValue: 18000000,
          loanTerms: {
            durationYears: 1,
            ourWagePercentage: 50,
            theirWagePercentage: 50,
            hasBuyOption: true,
            buyOptionFee: 18000000,
            sellOnPercentage: 15,
            partnerClub: "Real Sociedad",
          },
        },
      );

      const targetPlayer = updatedCareer.clubData[0].players![0];
      // Mantém sell=true e loan=false
      expect(targetPlayer.sell).toBe(true);
      expect(targetPlayer.loan).toBe(false);

      // Contrato de empréstimo atualizado
      const loanContract = targetPlayer.contract![0];
      expect(loanContract.buyOptionValue).toBe(18000000);
      expect(loanContract.loanTerms?.buyOptionFee).toBe(18000000);
      expect(loanContract.loanTerms?.buyOptionExercised).toBe(true);

      // Contrato de venda derivado sincronizado com novo valor
      const derivedSale = targetPlayer.contract![1];
      expect(derivedSale.fromLoanBuyOption).toBe(true);
      expect(derivedSale.sellValue).toBe(18000000);
      expect(derivedSale.transferClauses?.sellOnPercentage).toBe(15);
    });

    it("reverte o empréstimo excluindo o contrato derivado de venda e restaurando flags", () => {
      const exercisedPlayer: Players = {
        ...dummyLoanPlayerWithBuyOption,
        sell: true,
        loan: false,
        contract: [
          {
            ...dummyLoanPlayerWithBuyOption.contract![0],
            loanTerms: {
              ...dummyLoanPlayerWithBuyOption.contract![0].loanTerms!,
              buyOptionExercised: true,
              exercisedDate: "25/08",
            },
          },
          {
            buyValue: 0,
            sellValue: 15000000,
            leftClub: "Real Sociedad",
            fromClub: "",
            dataArrival: null,
            dataExit: new Date("2024-08-25"),
            isLoan: false,
            fromLoanBuyOption: true,
            sourceLoanContractIndex: 0,
          },
        ],
      };

      const careerWithPlayer: Career = {
        ...mockCareer,
        clubData: [
          {
            id: "season-1",
            seasonNumber: 1,
            players: [exercisedPlayer],
          },
        ],
      };

      const revertedCareer = applyRevertToCareer(
        careerWithPlayer,
        "season-1",
        exercisedPlayer.id,
        0,
        "exit",
      );

      const targetPlayer = revertedCareer.clubData[0].players![0];
      expect(targetPlayer.sell).toBe(false);
      expect(targetPlayer.loan).toBe(false);
      // Contrato derivado removido
      expect(targetPlayer.contract?.length).toBe(1);
      expect(targetPlayer.contract?.[0].fromLoanBuyOption).toBeUndefined();
    });
  });

  describe("TransfersPanel bloqueio de clique para fromLoanBuyOption", () => {
    it("renderiza a venda derivada mas bloqueia o clique (isClickable = false)", () => {
      const handleTransferClick = vi.fn();

      const exercisedPlayer: Players = {
        ...dummyLoanPlayerWithBuyOption,
        sell: true,
        loan: false,
        contract: [
          {
            ...dummyLoanPlayerWithBuyOption.contract![0],
            isLoan: true,
            leftClub: "Real Sociedad",
            dataExit: new Date("2024-07-15"),
            loanTerms: {
              ...dummyLoanPlayerWithBuyOption.contract![0].loanTerms!,
              buyOptionExercised: true,
              exercisedDate: "25/08",
            },
          },
          {
            buyValue: 0,
            sellValue: 15000000,
            leftClub: "Real Sociedad",
            fromClub: "",
            dataArrival: null,
            dataExit: new Date("2024-08-25"),
            isLoan: false,
            fromLoanBuyOption: true,
            sourceLoanContractIndex: 0,
          },
        ],
      };

      const currentSeason: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [exercisedPlayer],
      };

      render(
        <TransfersPanel
          title="Saídas"
          players={[exercisedPlayer]}
          career={mockCareer}
          season={currentSeason}
          onTransferClick={handleTransferClick}
        />,
      );

      // Deve renderizar tanto o empréstimo quanto a venda com taxa (€15M)
      expect(screen.getByText("Empréstimo")).toBeTruthy();
      expect(screen.getByText("€15M")).toBeTruthy();

      // Clicar no item de Venda (€15M) não deve disparar onTransferClick (isClickable = false)
      const saleElement = screen.getByText("€15M").closest("li");
      expect(saleElement).toBeTruthy();
      expect(saleElement?.style.cursor).toBe("default");
      fireEvent.click(saleElement!);
      expect(handleTransferClick).not.toHaveBeenCalled();

      // Clicar no item de Empréstimo deve disparar onTransferClick (isClickable = true)
      const loanElement = screen.getByText("Empréstimo").closest("li");
      expect(loanElement).toBeTruthy();
      expect(loanElement?.style.cursor).toBe("pointer");
      fireEvent.click(loanElement!);
      expect(handleTransferClick).toHaveBeenCalledTimes(1);
    });
  });
});
