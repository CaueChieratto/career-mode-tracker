// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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

  it("exibe Visualizar, Editar, Vender e Emprestar para jogador comum do clube", () => {
    render(
      <PlayerModal
        id="p1"
        playerName="Neymar"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Visualizar")).not.toBeNull();
    expect(screen.getByText("Editar")).not.toBeNull();
    expect(screen.getByText("Vender")).not.toBeNull();
    expect(screen.getByText("Emprestar")).not.toBeNull();
  });

  it("NÃO exibe Vender e Emprestar para jogador emprestado ao clube (incomingLoan: true)", () => {
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
    expect(screen.queryByText("Vender")).toBeNull();
    expect(screen.queryByText("Emprestar")).toBeNull();
  });

  it("NÃO exibe Vender e Emprestar para jogador que pertence ao clube e saiu emprestado (loan: true)", () => {
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
    expect(screen.queryByText("Vender")).toBeNull();
    expect(screen.queryByText("Emprestar")).toBeNull();
  });
});

