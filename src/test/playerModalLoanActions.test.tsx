// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PlayerModal } from "../layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements/Section/ui/PlayerModal";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ careerId: "c1", seasonId: "s1" }),
}));

vi.mock("../common/hooks/Colors/UseClubColors", () => ({
  useClubColors: () => ({ clubColor: "#000", darkClubColor: "#111" }),
}));

vi.mock("../common/services/ColorsService", () => ({
  ColorsService: {
    getColorSaved: () => "#000",
  },
}));

describe("PlayerModal - visibilidade de ações para empréstimos", () => {
  beforeEach(() => {
    cleanup();
  });

  it("exibe Visualizar, Editar e Transferir para jogador comum do clube", () => {
    render(
      <PlayerModal
        id="p1"
        playerName="Neymar"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Visualizar")).not.toBeNull();
    expect(screen.getByText("Editar")).not.toBeNull();
    expect(screen.getByText("Transferir")).not.toBeNull();
    expect(screen.queryByText("Vender")).toBeNull();
    expect(screen.queryByText("Emprestar")).toBeNull();
  });

  it("NÃO exibe Transferir para jogador emprestado ao clube (incomingLoan: true)", () => {
    render(
      <PlayerModal
        id="p2"
        playerName="Emprestado Para Nós"
        incomingLoan={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Visualizar")).not.toBeNull();
    expect(screen.getByText("Editar")).not.toBeNull();
    expect(screen.queryByText("Transferir")).toBeNull();
    expect(screen.queryByText("Vender")).toBeNull();
    expect(screen.queryByText("Emprestar")).toBeNull();
  });

  it("NÃO exibe Transferir para jogador que pertence ao clube e saiu emprestado (loan: true)", () => {
    render(
      <PlayerModal
        id="p3"
        playerName="Nosso Emprestado Fora"
        loan={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Visualizar")).not.toBeNull();
    expect(screen.getByText("Editar")).not.toBeNull();
    expect(screen.queryByText("Transferir")).toBeNull();
    expect(screen.queryByText("Vender")).toBeNull();
    expect(screen.queryByText("Emprestar")).toBeNull();
  });

  it("NÃO exibe Transferir para jogador vendido com saída agendada (timing diferente de Imediata)", () => {
    render(
      <PlayerModal
        id="p4"
        playerName="Atleta Vendido Futuro"
        sell={false}
        contract={[
          {
            buyValue: 0,
            sellValue: 40_000_000,
            fromClub: "",
            leftClub: "Real Madrid",
            dataArrival: null,
            dataExit: new Date("2025-01-01"),
            timing: "Próxima Janela",
          },
        ]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Visualizar")).not.toBeNull();
    expect(screen.getByText("Editar")).not.toBeNull();
    expect(screen.queryByText("Transferir")).toBeNull();
  });

  it("NÃO exibe Transferir para jogador com sell: true", () => {
    render(
      <PlayerModal
        id="p5"
        playerName="Atleta Vendido Imediato"
        sell={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Visualizar")).not.toBeNull();
    expect(screen.getByText("Editar")).not.toBeNull();
    expect(screen.queryByText("Transferir")).toBeNull();
  });

  it("exibe card Renovar para atleta regular do clube e aciona onOpenScreen com renewPlayer", async () => {
    const handleOpenScreen = vi.fn();
    const handleClose = vi.fn();

    render(
      <PlayerModal
        id="p_renew"
        playerName="Atleta a Renovar"
        onClose={handleClose}
        onOpenScreen={handleOpenScreen}
      />,
    );

    const renewCard = screen.getByText("Renovar");
    expect(renewCard).not.toBeNull();

    // Clica no card Renovar
    fireEvent.click(renewCard);

    // Verifica que o texto do botão muda para "Entrar na Renovação"
    const submitBtn = screen.getByRole("button", {
      name: /Entrar na Renovação/i,
    });
    expect(submitBtn).not.toBeNull();

    // Clica no botão de submissão
    fireEvent.click(submitBtn);

    expect(handleOpenScreen).toHaveBeenCalledWith({
      key: "renewPlayer",
      playerId: "p_renew",
    });
    expect(handleClose).toHaveBeenCalled();
  });

  it("chama onRenewPlayer quando provido ao confirmar Renovar", () => {
    const handleRenew = vi.fn();
    const handleClose = vi.fn();

    render(
      <PlayerModal
        id="p_custom_renew"
        playerName="Atleta com Callback"
        onClose={handleClose}
        onRenewPlayer={handleRenew}
      />,
    );

    fireEvent.click(screen.getByText("Renovar"));
    fireEvent.click(screen.getByRole("button", { name: /Entrar na Renovação/i }));

    expect(handleRenew).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });

  it("NÃO exibe card Renovar para atleta emprestado ao clube (incomingLoan: true) ou vendido (sell: true)", () => {
    const { unmount } = render(
      <PlayerModal
        id="p_in_loan"
        playerName="Emprestado"
        incomingLoan={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText("Renovar")).toBeNull();
    unmount();

    render(
      <PlayerModal
        id="p_sold"
        playerName="Vendido"
        sell={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText("Renovar")).toBeNull();
  });
});

