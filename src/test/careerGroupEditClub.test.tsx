// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CareerGroupCard } from "../pages/CareersPage/components/CareerGroupCard";
import { CareerPageContext } from "../pages/CareersPage/contexts/CareerPageContext";
import { SaveEditClub } from "../ui/modals/EditCareerModal/hooks/SaveEditClub";
import { ServiceCareer } from "../common/services/ServiceCareer";
import { ColorsService } from "../common/services/ColorsService";
import { ModalType } from "../common/types/enums/ModalType";
import { career } from "./factories/domain";
import type { CareerGroup } from "../common/interfaces/CareerGroup";
import type { Career } from "../common/interfaces/Career";

vi.mock("../common/services/ColorsService", () => ({
  ColorsService: {
    getColorSaved: vi.fn().mockReturnValue("#004D98"),
    saveColors: vi.fn(),
  },
}));

describe("Edição Completa de Clubes Agrupados (CareerGroup)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const barcaCareer1: Career = career({
    id: "barca-1",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    nation: "Espanha",
    groupId: "group-barca",
    createdAt: new Date("2023-08-01T00:00:00Z"),
    colorsTeams: ["#004D98", "#A50044"],
  });

  const barcaCareer2: Career = career({
    id: "barca-b",
    clubName: "FC Barcelona Atlètic",
    managerName: "Hansi Flick",
    nation: "Espanha",
    groupId: "group-barca",
    createdAt: new Date("2024-08-01T00:00:00Z"),
    colorsTeams: ["#004D98", "#A50044"],
  });

  const mockGroup: CareerGroup = {
    id: "group-barca",
    managerName: "Hansi Flick",
    createdAt: new Date("2023-08-01T00:00:00Z"),
    updatedAt: Date.now(),
    careerIds: ["barca-1", "barca-b"],
    careers: [barcaCareer1, barcaCareer2],
  };

  it("ao selecionar clube para editar no GroupEditModal, abre modal com ModalType.EDIT_CLUB (e não ADD_CLUB_IMG)", () => {
    const onOpenModalMock = vi.fn();
    const setSelectedCareerMock = vi.fn();

    render(
      <MemoryRouter>
        <CareerPageContext.Provider
          value={{
            onOpenModal: onOpenModalMock,
            setSelectedCareer: setSelectedCareerMock,
            onDragStart: vi.fn(),
            buttons: [],
            requestRemoval: vi.fn(),
          }}
        >
          <CareerGroupCard save={mockGroup} />
        </CareerPageContext.Provider>
      </MemoryRouter>,
    );

    // Clica no botão de lápis do cabeçalho do grupo
    const editGroupBtn = screen.getByRole("button", { name: "Editar save" });
    fireEvent.click(editGroupBtn);

    // Verifica que o modal "Escolha para editar" abriu
    expect(screen.getByText("Escolha para editar")).toBeDefined();

    // Seleciona o card do FC Barcelona dentro do modal
    const barcaCards = screen.getAllByText("FC Barcelona");
    const barcaModalCard = barcaCards[barcaCards.length - 1];
    fireEvent.click(barcaModalCard);

    // Botão de ação com nome do clube selecionado aparece
    const actionBtn = screen.getByRole("button", { name: "Editar FC Barcelona" });
    expect(actionBtn).toBeDefined();

    // Clica no botão para editar o clube selecionado
    fireEvent.click(actionBtn);

    // Deve abrir ModalType.EDIT_CLUB (que renderiza EditInfoClub completo) e NÃO ModalType.ADD_CLUB_IMG
    expect(onOpenModalMock).toHaveBeenCalledWith(
      ModalType.EDIT_CLUB,
      expect.objectContaining({
        id: "barca-1",
        clubName: "FC Barcelona",
      }),
    );
    expect(onOpenModalMock).not.toHaveBeenCalledWith(
      ModalType.ADD_CLUB_IMG,
      expect.anything(),
    );
    expect(setSelectedCareerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "barca-1",
        clubName: "FC Barcelona",
      }),
    );
  });

  describe("SaveEditClub - Sincronização de Metadados do Treinador no Grupo", () => {
    it("atualiza metadados do grupo se o clube pertence a um grupo e o treinador foi alterado", async () => {
      const editCareerSpy = vi
        .spyOn(ServiceCareer, "editCareer")
        .mockResolvedValueOnce();
      const updateGroupManagerSpy = vi
        .spyOn(ServiceCareer, "updateCareerGroupManager")
        .mockResolvedValueOnce();

      const updated = await SaveEditClub(
        barcaCareer1,
        "#004D98",
        "#A50044",
        "https://example.com/barca-new-badge.png",
        "FC Barcelona",
        "Pep Guardiola", // Treinador alterado
        new Date("2023-08-01T00:00:00Z"),
      );

      expect(editCareerSpy).toHaveBeenCalledWith(
        "barca-1",
        ["#004D98", "#A50044"],
        "https://example.com/barca-new-badge.png",
        "FC Barcelona",
        "Pep Guardiola",
        expect.any(Date),
      );

      expect(updateGroupManagerSpy).toHaveBeenCalledWith(
        "group-barca",
        "Pep Guardiola",
      );

      expect(ColorsService.saveColors).toHaveBeenCalledWith(
        "barca-1",
        "#004D98",
      );

      expect(updated.managerName).toBe("Pep Guardiola");
    });

    it("não atualiza documento do grupo se managerName permaneceu o mesmo", async () => {
      vi.spyOn(ServiceCareer, "editCareer").mockResolvedValueOnce();
      const updateGroupManagerSpy = vi
        .spyOn(ServiceCareer, "updateCareerGroupManager")
        .mockResolvedValueOnce();

      await SaveEditClub(
        barcaCareer1,
        "#004D98",
        "#A50044",
        undefined,
        "FC Barcelona",
        "Hansi Flick", // Mesmo treinador
      );

      expect(updateGroupManagerSpy).not.toHaveBeenCalled();
    });

    it("não tenta atualizar grupo se carreira não pertence a nenhum grupo", async () => {
      vi.spyOn(ServiceCareer, "editCareer").mockResolvedValueOnce();
      const updateGroupManagerSpy = vi
        .spyOn(ServiceCareer, "updateCareerGroupManager")
        .mockResolvedValueOnce();

      const standaloneCareer = career({
        id: "standalone-1",
        clubName: "FC Barcelona",
        managerName: "Hansi Flick",
        groupId: undefined,
      });

      await SaveEditClub(
        standaloneCareer,
        "#004D98",
        "#A50044",
        undefined,
        "FC Barcelona",
        "Pep Guardiola",
      );

      expect(updateGroupManagerSpy).not.toHaveBeenCalled();
    });
  });
});
