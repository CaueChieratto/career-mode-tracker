// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PlayerModal } from "../layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements/Section/ui/PlayerModal";
import { TransferPlayerScreen } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/screens/TransferPlayerScreen";
import { useTransferPlayerContext } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/contexts/context";
import { Career } from "../common/interfaces/Career";
import { Players } from "../common/interfaces/playersInfo/players";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  const React = await import("react");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "c1", seasonId: "s1" }),
    Form: React.forwardRef<
      HTMLFormElement,
      React.FormHTMLAttributes<HTMLFormElement>
    >(({ children, onSubmit, ...props }, ref) => (
      <form ref={ref} onSubmit={onSubmit} {...props}>
        {children}
      </form>
    )),
  };
});

vi.mock("../common/hooks/Colors/UseClubColors", () => ({
  useClubColors: () => ({ clubColor: "#000", darkClubColor: "#111" }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#ffffff",
    darkClubColor: "#000000",
    theme: {},
  }),
}));

vi.mock("../common/services/ColorsService", () => ({
  ColorsService: { getColorSaved: vi.fn() },
}));

vi.mock("../components/HeaderSeason", () => ({
  default: () => <div data-testid="header-season" />,
}));

vi.mock("../ui/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/contexts/context", () => ({
  useTransferPlayerContext: vi.fn(),
}));

describe("PlayerModal e TransferPlayerScreen - Fluxo Unificado de Transferência", () => {
  const onClose = vi.fn();
  const onOpenScreen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    document.body.innerHTML = "";
    document.body.className = "";
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    document.body.className = "";
  });

  describe("PlayerModal", () => {
    it("renderiza o card unificado 'Transferir' para jogador ativo normal", () => {
      render(
        <MemoryRouter>
          <PlayerModal
            id="p1"
            playerName="Gabriel Martinelli"
            onClose={onClose}
            onOpenScreen={onOpenScreen}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText("Visualizar")).not.toBeNull();
      expect(screen.getByText("Editar")).not.toBeNull();
      expect(screen.getByText("Transferir")).not.toBeNull();
    });

    it("não renderiza mais cards separados de 'Vender' ou 'Emprestar'", () => {
      render(
        <MemoryRouter>
          <PlayerModal
            id="p1"
            playerName="Gabriel Martinelli"
            onClose={onClose}
            onOpenScreen={onOpenScreen}
          />
        </MemoryRouter>,
      );

      expect(screen.queryByText("Vender")).toBeNull();
      expect(screen.queryByText("Emprestar")).toBeNull();
    });

    it("não exibe 'Transferir' quando o atleta está emprestado ao nosso clube (incomingLoan: true)", () => {
      render(
        <MemoryRouter>
          <PlayerModal
            id="p2"
            playerName="Atleta Emprestado Ao Clube"
            incomingLoan={true}
            onClose={onClose}
            onOpenScreen={onOpenScreen}
          />
        </MemoryRouter>,
      );

      expect(screen.queryByText("Transferir")).toBeNull();
    });

    it("não exibe 'Transferir' quando o atleta já está emprestado para fora (loan: true)", () => {
      render(
        <MemoryRouter>
          <PlayerModal
            id="p3"
            playerName="Atleta Cedido"
            loan={true}
            onClose={onClose}
            onOpenScreen={onOpenScreen}
          />
        </MemoryRouter>,
      );

      expect(screen.queryByText("Transferir")).toBeNull();
    });

    it("ao clicar em 'Transferir', exibe botão 'Entrar na Transferência'", () => {
      render(
        <MemoryRouter>
          <PlayerModal
            id="p1"
            playerName="Gabriel Martinelli"
            onClose={onClose}
            onOpenScreen={onOpenScreen}
          />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByText("Transferir"));
      expect(screen.getByText("Entrar na Transferência")).not.toBeNull();
    });

    it("ao confirmar transferência, chama onOpenScreen com a rota transferPlayer", () => {
      render(
        <MemoryRouter>
          <PlayerModal
            id="p1"
            playerName="Gabriel Martinelli"
            onClose={onClose}
            onOpenScreen={onOpenScreen}
          />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByText("Transferir"));
      fireEvent.click(screen.getByText("Entrar na Transferência"));

      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "transferPlayer",
        playerId: "p1",
        mode: "transfer",
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("TransferPlayerScreen", () => {
    it("renderiza seção com seletor de Tipo de Transferência e opções Venda e Emprestar", () => {
      vi.mocked(useTransferPlayerContext).mockReturnValue({
        career: { id: "c1", nation: "Inglaterra", clubName: "Arsenal" } as unknown as Career,
        player: { id: "p1", name: "Gabriel Martinelli", position: "PE", overall: 85 } as unknown as Players,
        onClose: vi.fn(),
        activeTab: 1,
        isLoading: false,
        formValues: { transferType: "Venda" },
        booleanValues: {},
        navText: "Vender Jogador",
        handleSave: vi.fn(),
        handleCustomInputChange: vi.fn(),
        handleBooleanChangeWrapper: vi.fn(),
        filteredTeamOptions: [],
      } as unknown as ReturnType<typeof useTransferPlayerContext>);

      render(
        <MemoryRouter>
          <TransferPlayerScreen />
        </MemoryRouter>,
      );

      expect(screen.getByText("Tipo de Transferência")).not.toBeNull();
      expect(screen.getByText("Venda")).not.toBeNull();
      expect(screen.getByText("Emprestar")).not.toBeNull();
    });

    it("alterna campos de formulário dependendo do activeTab (Venda vs Empréstimo)", () => {
      vi.mocked(useTransferPlayerContext).mockReturnValue({
        career: { id: "c1", nation: "Inglaterra", clubName: "Arsenal" } as unknown as Career,
        player: { id: "p1", name: "Gabriel Martinelli", position: "PE", overall: 85 } as unknown as Players,
        onClose: vi.fn(),
        activeTab: 2,
        isLoading: false,
        formValues: { transferType: "Emprestar" },
        booleanValues: {},
        navText: "Emprestar Jogador",
        handleSave: vi.fn(),
        handleCustomInputChange: vi.fn(),
        handleBooleanChangeWrapper: vi.fn(),
        filteredTeamOptions: [],
      } as unknown as ReturnType<typeof useTransferPlayerContext>);

      render(
        <MemoryRouter>
          <TransferPlayerScreen />
        </MemoryRouter>,
      );

      expect(screen.getByText("Tipo de Transferência")).not.toBeNull();
      expect(screen.getByText("Detalhes do Empréstimo")).not.toBeNull();
    });
  });
});

