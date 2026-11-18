// @vitest-environment jsdom
import { act, render, renderHook, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useSeasons } from "../pages/CareersPage/views/AddSeasons/hooks/useSeasons";
import SeasonCard from "../pages/CareersPage/views/AddSeasons/ui/SeasonCard";
import { ServiceSeasons } from "../common/services/ServiceSeasons";
import { toastStore, clearAllToasts, settleConfirm } from "../common/services/ToastService";
import { season } from "./factories/domain";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../common/services/ServiceSeasons", () => ({
  ServiceSeasons: {
    deleteSeason: vi.fn(),
  },
}));

describe("Exclusão de temporada - Feedback e Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllToasts();
  });

  it("não ativa loading enquanto o toast de confirmação estiver aguardando decisão do usuário", async () => {
    const { result } = renderHook(() => useSeasons("fc-barcelona-career-id"));

    // Dispara a exclusão da temporada
    let deletePromise!: Promise<void>;
    act(() => {
      deletePromise = result.current.handleDeleteSeason("season-1", 1);
    });

    // O toast de confirmação foi emitido
    const pendingToasts = toastStore.getSnapshot();
    const confirmToast = pendingToasts.find((t) => t.type === "confirm");
    expect(confirmToast).toBeDefined();
    expect(confirmToast?.message).toContain("Deseja deletar permanentemente a temporada 1?");

    // O loading NÃO deve estar ativo durante a exibição do toast de confirmação
    expect(result.current.deletingSeasonId).toBeNull();

    // Se o usuário cancela a confirmação no toast:
    await act(async () => {
      settleConfirm(confirmToast!.id, false);
      await deletePromise;
    });

    // O loading nunca se ativou e o serviço de exclusão não foi chamado
    expect(result.current.deletingSeasonId).toBeNull();
    expect(ServiceSeasons.deleteSeason).not.toHaveBeenCalled();
  });

  it("ativa o loading somente após o usuário confirmar a exclusão no toast e reseta ao concluir", async () => {
    let resolveDeleteSeason!: () => void;
    vi.mocked(ServiceSeasons.deleteSeason).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDeleteSeason = resolve;
        }),
    );

    const { result } = renderHook(() => useSeasons("fc-barcelona-career-id"));

    let deletePromise!: Promise<void>;
    act(() => {
      deletePromise = result.current.handleDeleteSeason("season-2", 2);
    });

    const confirmToast = toastStore.getSnapshot().find((t) => t.type === "confirm");
    expect(confirmToast).toBeDefined();

    // Antes da confirmação: sem loading
    expect(result.current.deletingSeasonId).toBeNull();

    // Usuário confirma a exclusão no toast
    await act(async () => {
      settleConfirm(confirmToast!.id, true);
    });

    // Agora o loading DEVE estar ativo para a temporada selecionada
    expect(result.current.deletingSeasonId).toBe("season-2");
    expect(ServiceSeasons.deleteSeason).toHaveBeenCalledWith("fc-barcelona-career-id", "season-2");

    // Conclui a operação assíncrona de exclusão
    await act(async () => {
      resolveDeleteSeason();
      await deletePromise;
    });

    // Ao finalizar, o loading é liberado
    expect(result.current.deletingSeasonId).toBeNull();
  });

  it("SeasonCard exibe Load apenas quando isLoading for true, sem acionar load ao clicar no ícone de delete", () => {
    const mockSeason = season({
      id: "s1",
      seasonNumber: 1,
    });
    const onClickMock = vi.fn();
    const onDeleteMock = vi.fn();

    const { rerender } = render(
      <SeasonCard
        season={mockSeason}
        isLoading={false}
        onClick={onClickMock}
        onDelete={onDeleteMock}
      />,
    );

    // O card normal é exibido com o texto da temporada
    expect(screen.getByText("Temporada 1")).toBeDefined();

    // Clica no ícone de exclusão
    const heading = screen.getByRole("heading", { name: "Temporada 1" });
    const deleteButton = heading.parentElement?.querySelector("div");
    expect(deleteButton).not.toBeNull();
    fireEvent.click(deleteButton!);

    // onDelete foi invocado sem disparar onClick do card
    expect(onDeleteMock).toHaveBeenCalledTimes(1);
    expect(onClickMock).not.toHaveBeenCalled();

    // Re-renderiza com isLoading=true (apenas após a confirmação pelo toast)
    rerender(
      <SeasonCard
        season={mockSeason}
        isLoading={true}
        onClick={onClickMock}
        onDelete={onDeleteMock}
      />,
    );

    // Agora exibe o spinner e não mais o texto/ícone
    expect(screen.queryByText("Temporada 1")).toBeNull();
  });
});
