// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SeasonList from "../pages/CareersPage/views/AddSeasons/components/SeasonList";
import { career, season } from "./factories/domain";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../common/hooks/Modal/UseModalManager", () => ({
  useModalManager: () => ({
    activeModal: "NONE",
    openModal: vi.fn(),
    closeModal: vi.fn(),
    selectedSeason: null,
    selectedCareer: null,
    setSelectedCareer: vi.fn(),
  }),
}));

vi.mock("../pages/CareersPage/views/AddSeasons/hooks/useSeasons", () => ({
  useSeasons: () => ({
    handleNavigateToSeason: vi.fn(),
    handleDeleteSeason: vi.fn(),
    deletingSeasonId: null,
  }),
}));

describe("SeasonList - Deduplicação de Temporadas (Padrão FC Barcelona)", () => {
  it("renderiza apenas uma instância de cada temporada quando há temporadas duplicadas no clubData", () => {
    const barcaCareer = career({
      id: "fc-barcelona-career",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
    });

    const clubDataWithDuplicates = [
      season({ id: "season-1", seasonNumber: 1 }),
      season({ id: "season-2", seasonNumber: 2 }),
      season({ id: "season-3", seasonNumber: 3 }),
      season({ id: "season-3", seasonNumber: 3 }), // Duplicata da temporada 3
    ];

    render(
      <SeasonList
        clubData={clubDataWithDuplicates}
        careerId={barcaCareer.id}
        career={barcaCareer}
      />,
    );

    expect(screen.getByText("Temporada 1")).toBeDefined();
    expect(screen.getByText("Temporada 2")).toBeDefined();
    expect(screen.getAllByText("Temporada 3")).toHaveLength(1);
    expect(screen.getByText("Geral")).toBeDefined();
  });
});
