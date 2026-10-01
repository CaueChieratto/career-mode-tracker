// @vitest-environment jsdom
import {
  act,
  render,
  renderHook,
  screen,
  fireEvent,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getCareerCardButtons } from "../pages/CareersPage/constants/CareerCardButtons";
import { useSeasons } from "../pages/AddSeasons/hooks/useSeasons";
import { career, season } from "./factories/domain";
import { SeasonConfigs } from "../ui/modals/SeasonConfigs";
import { CareerPageContext } from "../pages/CareersPage/contexts/CareerPageContext";
import CareerCard from "../pages/CareersPage/components/CareerCard";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../common/services/ServiceCareer", () => ({
  ServiceCareer: {},
}));

vi.mock("../common/services/ServiceSeasons", () => ({
  ServiceSeasons: {
    deleteSeason: vi.fn(),
    addSeason: vi.fn(),
  },
}));

vi.mock("../ui/modals/SeasonConfigs/hooks/useSeasonConfigs", () => ({
  useSeasonConfigs: () => ({
    view: "menu",
    setView: vi.fn(),
    currentSeasonId: "s1",
    country: "Brasil",
    selectedLeagues: ["Brasileirão"],
    setSelectedLeagues: vi.fn(),
    clubColor: "#ffffff",
    darkClubColor: "#000000",
    canProceed: true,
  }),
}));

vi.mock(
  "../ui/modals/SeasonConfigs/ui/AcademyConfigs/hooks/useAcademyConfigs",
  () => ({
    useAcademyConfigs: () => ({
      isSaving: false,
      handleSaveAcademy: vi.fn(),
    }),
  }),
);

describe("Stage 7C — Contrato de Navegação SPA", () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    navigateMock.mockReset();
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    document.body.className = "";
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
    document.body.className = "";
  });

  describe("CareersPage → Career", () => {
    it("utiliza navigate com URL correta, repassa state e reseta scroll sem full reload", () => {
      const mockCareer = career({ id: "career-123" });
      const buttons = getCareerCardButtons(navigateMock);
      const enterButton = buttons.find((b) => b.text === "Entrar");

      expect(enterButton).toBeDefined();
      expect(enterButton?.onClick).toBeDefined();

      enterButton!.onClick!(mockCareer);

      expect(navigateMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith("/Career/career-123", {
        state: { career: mockCareer },
      });
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    it("clique no botão Entrar do CareerCard via context dispara navigate SPA com career state", () => {
      const mockCareer = career({ id: "c1", clubName: "Meu Clube" });
      const buttons = getCareerCardButtons(navigateMock);
      const onOpenModalMock = vi.fn();
      const setSelectedCareerMock = vi.fn();

      render(
        <CareerPageContext.Provider
          value={{
            onOpenModal: onOpenModalMock,
            setSelectedCareer: setSelectedCareerMock,
            onDragStart: vi.fn(),
            buttons,
            requestRemoval: vi.fn(),
          }}
        >
          <CareerCard career={mockCareer} />
        </CareerPageContext.Provider>,
      );

      const enterButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(enterButton);

      expect(navigateMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith("/Career/c1", {
        state: { career: mockCareer },
      });
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  });

  describe("Career → Season", () => {
    it("navega via React Router, preserva rota, reseta scroll e remove modal-open do body", () => {
      document.body.classList.add("modal-open");
      expect(document.body.classList.contains("modal-open")).toBe(true);

      const { result } = renderHook(() => useSeasons("career-123"));

      act(() => {
        result.current.handleNavigateToSeason("season-456");
      });

      expect(navigateMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith(
        "/Career/career-123/Season/season-456",
      );
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
      expect(document.body.classList.contains("modal-open")).toBe(false);
    });

    it("handleNavigateToGeral também usa navegação SPA e remove modal-open", () => {
      document.body.classList.add("modal-open");

      const { result } = renderHook(() => useSeasons("career-123"));

      act(() => {
        result.current.handleNavigateToGeral("career-123");
      });

      expect(navigateMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith("/Career/career-123/Geral");
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
      expect(document.body.classList.contains("modal-open")).toBe(false);
    });

    it("ao clicar em Entrar na Temporada no SeasonConfigs, limpa modal-open preventivamente", () => {
      document.body.classList.add("modal-open");
      const onNavigateMock = vi.fn();
      const mockCareer = career({
        id: "c1",
        nation: "Brasil",
        clubData: [
          season({
            id: "s1",
            leagues: [
              {
                name: "Brasileirão",
                trophy: "trophy.png",
                logo: "logo.png",
              },
            ],
            seasonNumber: 1,
          }),
        ],
      });

      render(
        <SeasonConfigs
          career={mockCareer}
          setSelectedCareer={vi.fn()}
          onNavigate={onNavigateMock}
          seasonName="Temporada 1"
          season={mockCareer.clubData[0]}
        />,
      );

      const enterBtn = screen.getByRole("button", {
        name: "Entrar na Temporada",
      });
      fireEvent.click(enterBtn);

      expect(onNavigateMock).toHaveBeenCalledTimes(1);
      expect(document.body.classList.contains("modal-open")).toBe(false);
    });
  });
});
