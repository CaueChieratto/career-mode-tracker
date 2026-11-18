// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  renderHook,
  act,
} from "@testing-library/react";
import React from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import {
  TransferDraftService,
  PendingTransferDraft,
} from "../common/services/TransferDraftService";
import { useAddTransferPlayerForm } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer/hooks/useAddTransferPlayerForm";
import AddTransferPlayer from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer";
import ManageClauses from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses";
import EditTransferScreen from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/screens/EditTransferScreen";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Field } from "../components/FormSection";
import { clearAllToasts, toastStore } from "../common/services/ToastService";
import { ServiceProposals } from "../common/services/ServiceProposals";

// Mocks
vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: {
    currentUser: { uid: "test-user-123" },
  },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(),
  collection: vi.fn(),
  onSnapshot: vi.fn((_ref, callback) => {
    callback?.({ docs: [] });
    return vi.fn();
  }),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#ff0000",
    darkClubColor: "#990000",
  }),
}));

vi.mock("../contexts/SeasonThemeContext", () => ({
  SeasonThemeContext: React.createContext({
    clubColor: "#ff0000",
    darkClubColor: "#990000",
    activeStyle: {
      backgroundColor: "#ff0000",
      color: "#ffffff",
      fontWeight: 600,
      border: "1px solid #990000",
      clubColor: "#ff0000",
      darkClubColor: "#990000",
    },
    career: {} as Career,
    changeClubColor: vi.fn(),
  }),
  useSeasonTheme: () => ({
    clubColor: "#ff0000",
    darkClubColor: "#990000",
  }),
}));

vi.mock(
  "../common/services/ServiceMatches",
  () => ({
    ServiceMatches: {
      getAllTeamsAcrossUserCareers: async () => [
        "Real Madrid",
        "Barcelona",
        "Arsenal",
      ],
    },
  }),
);

if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

function renderWithRouter(ui: React.ReactElement) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: ui,
      },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("Suíte de Testes: Backup Persistente, Fluxo Multi-Step e Convergência de Transferências", () => {
  const mockCareer: Career = {
    id: "career-test-1",
    clubName: "Arsenal",
    managerName: "Mikel Arteta",
    teamBadge: "",
    colorsTeams: ["#ff0000", "#ffffff"],
    trophies: [],
    nation: "Inglaterra",
    currency: "€",
    createdAt: new Date("2024-07-01"),
    clubData: [
      {
        id: "season-test-1",
        seasonNumber: 1,
        name: "2024/2025",
        players: [],
      } as ClubData,
    ],
  };

  const mockSeason = mockCareer.clubData[0];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    clearAllToasts();
    window.alert = vi.fn();
    window.confirm = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    clearAllToasts();
    cleanup();
  });

  describe("1. TransferDraftService (Camada de Backup Persistente)", () => {
    it("gera chave de storage consistente indexada por careerId e seasonId", () => {
      const key = TransferDraftService.buildKey("c1", "s1");
      expect(key).toBe("career_tracker_pending_transfer_c1_s1");
    });

    it("salva, recupera e verifica existência de rascunho com sucesso", () => {
      const draft: PendingTransferDraft = {
        careerId: "career-test-1",
        seasonId: "season-test-1",
        timestamp: Date.now(),
        step: 2,
        playerName: "Florian Wirtz",
        fromClub: "Bayer Leverkusen",
        position: "MEI",
        playerValue: "110000000",
        transferFee: "125000000",
        formValues: {
          playerName: "Florian Wirtz",
          fromClub: "Bayer Leverkusen",
          position: "MEI",
          sector: "Meio-Campo",
          nation: "Alemanha",
          buyValue: "125000000",
        },
        booleanValues: { isCaptain: false },
        bonuses: [],
      };

      expect(
        TransferDraftService.hasDraft("career-test-1", "season-test-1"),
      ).toBe(false);
      expect(
        TransferDraftService.getDraft("career-test-1", "season-test-1"),
      ).toBeNull();

      TransferDraftService.saveDraft("career-test-1", "season-test-1", draft);

      expect(
        TransferDraftService.hasDraft("career-test-1", "season-test-1"),
      ).toBe(true);
      const retrieved = TransferDraftService.getDraft(
        "career-test-1",
        "season-test-1",
      );
      expect(retrieved).not.toBeNull();
      expect(retrieved?.playerName).toBe("Florian Wirtz");
      expect(retrieved?.fromClub).toBe("Bayer Leverkusen");
      expect(retrieved?.step).toBe(2);
    });

    it("limpa o rascunho corretamente com clearDraft", () => {
      const draft: PendingTransferDraft = {
        careerId: "career-test-1",
        seasonId: "season-test-1",
        timestamp: Date.now(),
        step: 2,
        playerName: "Rodrygo",
        formValues: {},
        booleanValues: {},
      };

      TransferDraftService.saveDraft("career-test-1", "season-test-1", draft);
      expect(
        TransferDraftService.hasDraft("career-test-1", "season-test-1"),
      ).toBe(true);

      TransferDraftService.clearDraft("career-test-1", "season-test-1");
      expect(
        TransferDraftService.hasDraft("career-test-1", "season-test-1"),
      ).toBe(false);
      expect(
        TransferDraftService.getDraft("career-test-1", "season-test-1"),
      ).toBeNull();
    });

    it("mantém isolamento estrito entre diferentes temporadas e carreiras", () => {
      const draft1: PendingTransferDraft = {
        careerId: "c1",
        seasonId: "s1",
        timestamp: Date.now(),
        step: 2,
        playerName: "Jogador C1-S1",
        formValues: {},
        booleanValues: {},
      };
      const draft2: PendingTransferDraft = {
        careerId: "c1",
        seasonId: "s2",
        timestamp: Date.now(),
        step: 2,
        playerName: "Jogador C1-S2",
        formValues: {},
        booleanValues: {},
      };
      const draft3: PendingTransferDraft = {
        careerId: "c2",
        seasonId: "s1",
        timestamp: Date.now(),
        step: 2,
        playerName: "Jogador C2-S1",
        formValues: {},
        booleanValues: {},
      };

      TransferDraftService.saveDraft("c1", "s1", draft1);
      TransferDraftService.saveDraft("c1", "s2", draft2);
      TransferDraftService.saveDraft("c2", "s1", draft3);

      expect(TransferDraftService.getDraft("c1", "s1")?.playerName).toBe(
        "Jogador C1-S1",
      );
      expect(TransferDraftService.getDraft("c1", "s2")?.playerName).toBe(
        "Jogador C1-S2",
      );
      expect(TransferDraftService.getDraft("c2", "s1")?.playerName).toBe(
        "Jogador C2-S1",
      );

      TransferDraftService.clearDraft("c1", "s1");
      expect(TransferDraftService.getDraft("c1", "s1")).toBeNull();
      expect(TransferDraftService.getDraft("c1", "s2")?.playerName).toBe(
        "Jogador C1-S2",
      );
      expect(TransferDraftService.getDraft("c2", "s1")?.playerName).toBe(
        "Jogador C2-S1",
      );
    });

    it("é resiliente contra falhas de quota ou dados corrompidos no localStorage", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      // Simula erro de QuotaExceeded no setItem
      vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw new Error("QuotaExceededError");
      });

      expect(() => {
        TransferDraftService.saveDraft("c1", "s1", {
          careerId: "c1",
          seasonId: "s1",
          timestamp: Date.now(),
          step: 2,
          playerName: "Test",
          formValues: {},
          booleanValues: {},
        });
      }).not.toThrow();

      // Simula JSON inválido no getItem
      localStorage.setItem(
        "career_tracker_pending_transfer_c1_s1",
        "{invalid-json",
      );
      expect(TransferDraftService.getDraft("c1", "s1")).toBeNull();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("2. useAddTransferPlayerForm (Multi-Step & Validações)", () => {
    it("inicia na Etapa 1 por padrão", () => {
      const { result } = renderHook(() =>
        useAddTransferPlayerForm({
          career: mockCareer,
          season: mockSeason,
          onClose: vi.fn(),
        }),
      );

      expect(result.current.currentStep).toBe(1);
    });

    it("bloqueia avanço para Etapa 2 se campos obrigatórios da Etapa 1 estiverem ausentes", () => {
      const { result } = renderHook(() =>
        useAddTransferPlayerForm({
          career: mockCareer,
          season: mockSeason,
          onClose: vi.fn(),
        }),
      );

      // 1. Sem nome do jogador
      act(() => {
        const canProceed = result.current.handleProceedToStep2();
        expect(canProceed).toBe(false);
      });
      expect(result.current.currentStep).toBe(1);
      expect(
        toastStore
          .getSnapshot()
          .some(
            (t) =>
              t.type === "warning" &&
              t.message === "Por favor, informe o nome do jogador.",
          ),
      ).toBe(true);

      // 2. Preenche nome mas sem clube de origem
      act(() => {
        result.current.setFormValues((prev) => ({
          ...prev,
          playerName: "Endrick",
        }));
      });
      act(() => {
        const canProceed = result.current.handleProceedToStep2();
        expect(canProceed).toBe(false);
      });
      expect(result.current.currentStep).toBe(1);
      expect(
        toastStore
          .getSnapshot()
          .some(
            (t) =>
              t.type === "warning" &&
              t.message === "Por favor, selecione ou informe o clube de origem.",
          ),
      ).toBe(true);

      // 3. Preenche clube de origem mas sem setor/posição
      act(() => {
        result.current.setFormValues((prev) => ({
          ...prev,
          fromClub: "Palmeiras",
        }));
      });
      act(() => {
        const canProceed = result.current.handleProceedToStep2();
        expect(canProceed).toBe(false);
      });
      expect(result.current.currentStep).toBe(1);
      expect(
        toastStore
          .getSnapshot()
          .some(
            (t) =>
              t.type === "warning" &&
              t.message === "Por favor, informe a posição e o setor do atleta.",
          ),
      ).toBe(true);

      // 4. Preenche posição/setor mas sem valor para compra
      act(() => {
        result.current.setFormValues((prev) => ({
          ...prev,
          sector: "Ataque",
          position: "ATA",
          transferType: "Compra",
        }));
      });
      act(() => {
        const canProceed = result.current.handleProceedToStep2();
        expect(canProceed).toBe(false);
      });
      expect(result.current.currentStep).toBe(1);
      expect(
        toastStore
          .getSnapshot()
          .some(
            (t) =>
              t.type === "warning" &&
              t.message ===
                "Por favor, informe o valor da compra ou de mercado do jogador.",
          ),
      ).toBe(true);
    });

    it("avança para Etapa 2 com dados válidos e grava snapshot no TransferDraftService", () => {
      const { result } = renderHook(() =>
        useAddTransferPlayerForm({
          career: mockCareer,
          season: mockSeason,
          onClose: vi.fn(),
        }),
      );

      act(() => {
        result.current.setFormValues((prev) => ({
          ...prev,
          playerName: "Bukayo Saka",
          nation: "Inglaterra",
          sector: "Ataque",
          position: "PD",
          fromClub: "Arsenal Academy",
          buyValue: "80000000",
          playerValue: "120000000",
        }));
        result.current.handleBooleanChange("isCaptain", true);
      });

      act(() => {
        const canProceed = result.current.handleProceedToStep2();
        expect(canProceed).toBe(true);
      });

      expect(result.current.currentStep).toBe(2);

      // Verifica se o rascunho foi gravado em localStorage
      const draft = TransferDraftService.getDraft(mockCareer.id, mockSeason.id);
      expect(draft).not.toBeNull();
      expect(draft?.playerName).toBe("Bukayo Saka");
      expect(draft?.fromClub).toBe("Arsenal Academy");
      expect(draft?.booleanValues.isCaptain).toBe(true);
      expect(draft?.step).toBe(2);
    });

    it("retorna da Etapa 2 para Etapa 1 mantendo todos os dados já digitados", () => {
      const { result } = renderHook(() =>
        useAddTransferPlayerForm({
          career: mockCareer,
          season: mockSeason,
          onClose: vi.fn(),
        }),
      );

      act(() => {
        result.current.setFormValues((prev) => ({
          ...prev,
          playerName: "Declan Rice",
          sector: "Meio-Campo",
          position: "VOL",
          fromClub: "West Ham",
          buyValue: "100000000",
        }));
      });

      act(() => {
        result.current.handleProceedToStep2();
      });
      expect(result.current.currentStep).toBe(2);

      // Preenche dados na Etapa 2
      act(() => {
        result.current.setFormValues((prev) => ({
          ...prev,
          salary: "250000",
          contractUntil: "30/06/2029",
        }));
      });

      // Retorna para a Etapa 1
      act(() => {
        result.current.handleReturnToStep1();
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.formValues.playerName).toBe("Declan Rice");
      expect(result.current.formValues.fromClub).toBe("West Ham");
      expect(result.current.formValues.salary).toBe("250000");
      expect(result.current.formValues.contractUntil).toBe("30/06/2029");
    });

    it("calcula dinamicamente contractTime a partir de contractUntil formatado", () => {
      const { result } = renderHook(() =>
        useAddTransferPlayerForm({
          career: mockCareer,
          season: mockSeason,
          onClose: vi.fn(),
        }),
      );

      // Simula alteração do input contractUntil
      const mockEvent = {
        target: { value: "30/06/2029" },
      } as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleInputChange(mockEvent, {
          id: "contractUntil",
          name: "Tempo de Contrato",
        } as unknown as Field);
      });

      expect(result.current.formValues.contractUntil).toBe("30/06/2029");
      expect(
        Number(result.current.formValues.contractTime),
      ).toBeGreaterThanOrEqual(1);
      expect(
        Number(result.current.formValues.contractTime),
      ).toBeLessThanOrEqual(7);
    });

    it("restaura rascunho persistido e inicializa diretamente na Etapa 2", () => {
      const savedDraft: PendingTransferDraft = {
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        timestamp: Date.now(),
        step: 2,
        playerName: "Martin Odegaard",
        fromClub: "Real Madrid",
        position: "MEI",
        formValues: {
          playerName: "Martin Odegaard",
          fromClub: "Real Madrid",
          sector: "Meio-Campo",
          position: "MEI",
          salary: "200000",
          buyValue: "35000000",
        },
        booleanValues: { isCaptain: true },
        bonuses: [],
      };

      TransferDraftService.saveDraft(mockCareer.id, mockSeason.id, savedDraft);

      const { result } = renderHook(() =>
        useAddTransferPlayerForm({
          career: mockCareer,
          season: mockSeason,
          onClose: vi.fn(),
          restoreDraft: true,
        }),
      );

      expect(result.current.currentStep).toBe(2);
      expect(result.current.formValues.playerName).toBe("Martin Odegaard");
      expect(result.current.formValues.fromClub).toBe("Real Madrid");
      expect(result.current.booleanValues.isCaptain).toBe(true);
    });
  });

  describe("3. Fluxo de Envio de Proposta em AddTransferPlayer e ProposalPlayerTerms", () => {
    it("valida campos obrigatórios ao clicar em Enviar Proposta na Navbar", async () => {
      clearAllToasts();
      const onCloseMock = vi.fn();

      renderWithRouter(
        <AddTransferPlayer
          career={mockCareer}
          season={mockSeason}
          onClose={onCloseMock}
        />,
      );

      // Botão do Navbar agora é 'Enviar Proposta'
      const sendButton = screen.getByText("Enviar Proposta");
      expect(sendButton).toBeDefined();

      fireEvent.click(sendButton);

      expect(
        toastStore
          .getSnapshot()
          .some(
            (t) =>
              t.type === "warning" &&
              t.message === "Por favor, informe o nome do jogador.",
          ),
      ).toBe(true);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it("ao preencher informações do atleta e clube, cria proposta e redireciona para ManageClauses", async () => {
      clearAllToasts();
      const onCloseMock = vi.fn();
      const onOpenScreenMock = vi.fn();

      const createdMockProposal = {
        id: "prop_martinelli_1",
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        type: "compra",
        playerName: "Gabriel Martinelli",
      };

      vi.spyOn(ServiceProposals, "createProposal").mockResolvedValueOnce(
        createdMockProposal as unknown as TransferProposal,
      );

      const draft: PendingTransferDraft = {
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        timestamp: Date.now(),
        step: 1,
        playerName: "Gabriel Martinelli",
        fromClub: "Ituano",
        position: "PE",
        formValues: {
          playerName: "Gabriel Martinelli",
          fromClub: "Ituano",
          sector: "Ataque",
          position: "PE",
          buyValue: "6M",
          timing: "Imediata",
        },
        booleanValues: {},
        bonuses: [],
      };
      TransferDraftService.saveDraft(mockCareer.id, mockSeason.id, draft);

      renderWithRouter(
        <AddTransferPlayer
          career={mockCareer}
          season={mockSeason}
          onClose={onCloseMock}
          onOpenScreen={onOpenScreenMock}
          restoreDraft={true}
        />,
      );

      const sendButton = screen.getByText("Enviar Proposta");
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(ServiceProposals.createProposal).toHaveBeenCalledWith(
          mockCareer.id,
          mockSeason.id,
          expect.objectContaining({
            careerId: mockCareer.id,
            seasonId: mockSeason.id,
            playerName: "Gabriel Martinelli",
            timing: "Imediata",
          }),
        );
      });

      expect(onOpenScreenMock).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "manageClauses",
          initialTab: "arrivals",
          selectedPlayerName: "Gabriel Martinelli",
          selectedProposalId: "prop_martinelli_1",
        }),
      );
      expect(onCloseMock).toHaveBeenCalled();
    });

    it("restaura rascunho persistido mantendo os campos preenchidos", () => {
      const draft: PendingTransferDraft = {
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        timestamp: Date.now(),
        step: 1,
        playerName: "Rodrygo Goes",
        fromClub: "Santos",
        position: "PD",
        formValues: {
          playerName: "Rodrygo Goes",
          fromClub: "Santos",
          sector: "Ataque",
          position: "PD",
          buyValue: "45M",
          timing: "Imediata",
        },
        booleanValues: {},
        bonuses: [],
      };
      TransferDraftService.saveDraft(mockCareer.id, mockSeason.id, draft);

      renderWithRouter(
        <AddTransferPlayer
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
          restoreDraft={true}
        />,
      );

      expect(
        (screen.getByPlaceholderText("Ex: Lionel Messi") as HTMLInputElement).value,
      ).toBe("Rodrygo Goes");
      expect(
        (screen.getByPlaceholderText("Ex: Barcelona") as HTMLInputElement).value,
      ).toBe("Santos");
    });
  });

  describe("4. ManageClauses e PendingTransferDraftCard", () => {
    it("renderiza o PendingTransferDraftCard quando há rascunho pendente no storage", () => {
      const draft: PendingTransferDraft = {
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        timestamp: Date.now(),
        step: 2,
        playerName: "Alexander Isak",
        fromClub: "Newcastle",
        position: "ATA",
        transferFee: "70000000",
        formValues: {
          playerName: "Alexander Isak",
          fromClub: "Newcastle",
          position: "ATA",
        },
        booleanValues: {},
      };
      TransferDraftService.saveDraft(mockCareer.id, mockSeason.id, draft);

      renderWithRouter(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
          onOpenScreen={vi.fn()}
          initialTab="arrivals"
        />,
      );

      expect(screen.getByTestId("pending-transfer-draft-card")).toBeDefined();
      expect(screen.getByText("Alexander Isak")).toBeDefined();
      expect(screen.getByText("Newcastle")).toBeDefined();
      expect(screen.getByTestId("btn-resume-draft")).toBeDefined();
      expect(screen.getByTestId("btn-cancel-draft")).toBeDefined();
    });

    it("não renderiza o PendingTransferDraftCard quando não há rascunho no storage", () => {
      renderWithRouter(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
          onOpenScreen={vi.fn()}
          initialTab="arrivals"
        />,
      );

      expect(screen.queryByTestId("pending-transfer-draft-card")).toBeNull();
    });

    it("ao clicar em 'Continuar', aciona onOpenScreen com restoreDraft: true", () => {
      const draft: PendingTransferDraft = {
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        timestamp: Date.now(),
        step: 2,
        playerName: "Viktor Gyokeres",
        fromClub: "Sporting CP",
        position: "ATA",
        formValues: {},
        booleanValues: {},
      };
      TransferDraftService.saveDraft(mockCareer.id, mockSeason.id, draft);

      const onOpenScreenMock = vi.fn();

      renderWithRouter(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
          onOpenScreen={onOpenScreenMock}
          initialTab="arrivals"
        />,
      );

      fireEvent.click(screen.getByTestId("btn-resume-draft"));

      expect(onOpenScreenMock).toHaveBeenCalledWith({
        key: "addTransferPlayer",
        seasonId: mockSeason.id,
        restoreDraft: true,
      });
    });

    it("ao clicar em 'Descartar', abre modal de confirmação, e ao confirmar limpa o storage e remove o card da tela", async () => {
      const draft: PendingTransferDraft = {
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        timestamp: Date.now(),
        step: 2,
        playerName: "Benjamin Sesko",
        fromClub: "RB Leipzig",
        position: "ATA",
        formValues: {},
        booleanValues: {},
      };
      TransferDraftService.saveDraft(mockCareer.id, mockSeason.id, draft);

      renderWithRouter(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
          onOpenScreen={vi.fn()}
          initialTab="arrivals"
        />,
      );

      expect(screen.getByTestId("pending-transfer-draft-card")).toBeDefined();

      // Clicar em descartar abre o modal de confirmação
      fireEvent.click(screen.getByTestId("btn-cancel-draft"));

      // Draft ainda deve existir no storage
      expect(
        TransferDraftService.hasDraft(mockCareer.id, mockSeason.id),
      ).toBe(true);

      // Botão 'Cancelar' do modal fecha o modal e mantém o card
      const cancelModalBtn = screen.getByText("Cancelar");
      fireEvent.click(cancelModalBtn);
      expect(screen.getByTestId("pending-transfer-draft-card")).toBeDefined();

      // Clicar novamente em descartar e confirmar a exclusão
      fireEvent.click(screen.getByTestId("btn-cancel-draft"));
      const confirmModalBtn = screen.getByText("Confirmar");
      fireEvent.click(confirmModalBtn);

      await waitFor(() => {
        expect(
          TransferDraftService.hasDraft(mockCareer.id, mockSeason.id),
        ).toBe(false);
        expect(screen.queryByTestId("pending-transfer-draft-card")).toBeNull();
      });
    });

    it("exibe o card de backup pendente exclusivamente na aba 'Chegadas' e não renderiza timestamp", () => {
      const draft: PendingTransferDraft = {
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        timestamp: new Date("2026-05-10T14:30:00").getTime(),
        step: 2,
        playerName: "Florian Wirtz",
        fromClub: "Bayer Leverkusen",
        position: "MEI",
        playerValue: "100M",
        formValues: {},
        booleanValues: {},
      };
      TransferDraftService.saveDraft(mockCareer.id, mockSeason.id, draft);

      const { unmount } = renderWithRouter(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
          initialTab="renewals"
        />,
      );
      expect(screen.queryByTestId("pending-transfer-draft-card")).toBeNull();
      unmount();

      const { unmount: unmountExit } = renderWithRouter(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
          initialTab="exit"
        />,
      );
      expect(screen.queryByTestId("pending-transfer-draft-card")).toBeNull();
      unmountExit();

      renderWithRouter(
        <ManageClauses
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
          initialTab="arrivals"
        />,
      );
      const card = screen.getByTestId("pending-transfer-draft-card");
      expect(card).toBeDefined();
      expect(card.textContent).not.toContain("10/05");
      expect(card.textContent).not.toContain("14:30");
      expect(card.textContent).toContain("€100M");
    });
  });

  describe("5. EditTransferScreen (Fluxo de 2 Etapas e Banner Explicativo)", () => {
    const testPlayer = {
      id: "player-saliba",
      name: "William Saliba",
      position: "ZAG",
      sector: "Defesa",
      salary: 190000,
      contractTime: 5,
      contractUntil: "30/06/2029",
      contract: [
        {
          fromClub: "Saint-Étienne",
          buyValue: 30000000,
          salary: 190000,
          contractUntil: "30/06/2029",
          dataArrival: new Date("2024-07-01"),
        },
      ],
    } as unknown as Players;

    it("renderiza Etapa 1 com botão 'Próximo' no Navbar", () => {
      renderWithRouter(
        <EditTransferScreen
          career={mockCareer}
          season={mockSeason}
          player={testPlayer}
          contract={testPlayer.contract![0]}
          contractIndex={0}
          direction="arrivals"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("Próximo")).toBeDefined();
      expect(screen.queryByText("Salvar Alterações")).toBeNull();
      expect(
        screen.queryByText(
          "As cláusulas contratuais e metas deste atleta são administradas na tela de Cláusulas Contratuais.",
        ),
      ).toBeNull();
    });

    it("avança para a Etapa 2 ao clicar em 'Próximo' e exibe o banner informativo de cláusulas", () => {
      renderWithRouter(
        <EditTransferScreen
          career={mockCareer}
          season={mockSeason}
          player={testPlayer}
          contract={testPlayer.contract![0]}
          contractIndex={0}
          direction="arrivals"
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Próximo"));

      // Agora na Etapa 2
      expect(screen.getByText("Salvar Alterações")).toBeDefined();
      expect(screen.queryByText("Próximo")).toBeNull();

      // Banner explicativo visível
      expect(
        screen.getByText(
          "As cláusulas contratuais e metas deste atleta são administradas na tela de Cláusulas Contratuais.",
        ),
      ).toBeDefined();
    });
  });
});
