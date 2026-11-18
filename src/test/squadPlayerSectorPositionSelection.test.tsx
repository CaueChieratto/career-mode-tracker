// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { getSquadFormFields, normalizeSector } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/constants/SquadFormFields";
import { useSquadPlayerForm } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/hooks/useSquadPlayerForm";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { positionOptionsBySector } from "../common/types/Positions";
import { Field } from "../components/FormSection";

const mockCareer: Career = {
  id: "c_barca",
  clubName: "FC Barcelona",
  managerName: "Hansi Flick",
  currency: "EUR",
  nation: "ESP",
  teamBadge: "https://example.com/barca.png",
  colorsTeams: ["#004d98", "#a50044"],
  trophies: [],
  createdAt: new Date("2024-07-01"),
  updatedAt: Date.now(),
  clubData: [],
};

const mockSeason: ClubData = {
  id: "s_2024_2025",
  seasonNumber: 1,
  players: [],
  matches: [],
};

describe("Frente 3 de .md: CustomSelect de Posição filtrado por Setor em AddSquad_Player (Padrão FC Barcelona)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getSquadFormFields com sectorValue dinâmico", () => {
    it("deve fornecer as posições correspondentes ao setor Meia (Pedri / Gavi)", () => {
      const fields = getSquadFormFields("ESP", [], [], "Meia");
      const playerInfoSection = fields.find((s) => s.title === "Informações do Jogador");
      const positionField = playerInfoSection?.fields.flat().find((f) => f.id === "position") as { options?: string[] } | undefined;

      expect(positionField).toBeDefined();
      expect(positionField?.options).toEqual([...positionOptionsBySector["Meia"]]);
      expect(positionField?.options).toContain("MC");
      expect(positionField?.options).toContain("MEI");
      expect(positionField?.options).toContain("VOL");
    });

    it("deve fornecer as posições correspondentes ao setor Ataque (Lamine Yamal)", () => {
      const fields = getSquadFormFields("ESP", [], [], "Ataque");
      const playerInfoSection = fields.find((s) => s.title === "Informações do Jogador");
      const positionField = playerInfoSection?.fields.flat().find((f) => f.id === "position") as { options?: string[] } | undefined;

      expect(positionField).toBeDefined();
      expect(positionField?.options).toEqual([...positionOptionsBySector["Ataque"]]);
      expect(positionField?.options).toContain("PD");
      expect(positionField?.options).toContain("PE");
      expect(positionField?.options).toContain("ATA");
    });

    it("deve fornecer as posições correspondentes ao setor Defesa (Pau Cubarsí)", () => {
      const fields = getSquadFormFields("ESP", [], [], "Defesa");
      const playerInfoSection = fields.find((s) => s.title === "Informações do Jogador");
      const positionField = playerInfoSection?.fields.flat().find((f) => f.id === "position") as { options?: string[] } | undefined;

      expect(positionField).toBeDefined();
      expect(positionField?.options).toEqual([...positionOptionsBySector["Defesa"]]);
      expect(positionField?.options).toContain("ZAG");
      expect(positionField?.options).toContain("LE");
      expect(positionField?.options).toContain("LD");
    });

    it("deve fornecer a posição de Goleiro (Marc-André ter Stegen)", () => {
      const fields = getSquadFormFields("GER", [], [], "Goleiro");
      const playerInfoSection = fields.find((s) => s.title === "Informações do Jogador");
      const positionField = playerInfoSection?.fields.flat().find((f) => f.id === "position") as { options?: string[] } | undefined;

      expect(positionField).toBeDefined();
      expect(positionField?.options).toEqual(["GOL"]);
    });

    it("deve mapear setores legados através de normalizeSector", () => {
      expect(normalizeSector("Meias")).toBe("Meia");
      expect(normalizeSector("Atacantes")).toBe("Ataque");
      expect(normalizeSector("Defensores")).toBe("Defesa");
      expect(normalizeSector("Goleiros")).toBe("Goleiro");
    });
  });

  describe("useSquadPlayerForm - Atualização de Posição ao trocar de Setor", () => {
    it("ao alterar o setor de Ataque para Meia, reajusta a posição para a primeira disponível do novo setor se a atual for incompatível", () => {
      const { result } = renderHook(() =>
        useSquadPlayerForm(undefined, mockCareer, mockSeason),
      );

      // Define setor Ataque e posição PD (Lamine Yamal)
      act(() => {
        result.current.handleInputChange(
          { target: { value: "Ataque" } } as React.ChangeEvent<HTMLSelectElement>,
          { id: "sector" } as Field,
        );
      });
      act(() => {
        result.current.handleInputChange(
          { target: { value: "PD" } } as React.ChangeEvent<HTMLSelectElement>,
          { id: "position" } as Field,
        );
      });

      expect(result.current.formValues.sector).toBe("Ataque");
      expect(result.current.formValues.position).toBe("PD");

      // Troca setor para Meia: PD não existe em Meia, então deve assumir a primeira posição do setor (MEI ou MC)
      act(() => {
        result.current.handleInputChange(
          { target: { value: "Meia" } } as React.ChangeEvent<HTMLSelectElement>,
          { id: "sector" } as Field,
        );
      });

      expect(result.current.formValues.sector).toBe("Meia");
      expect(positionOptionsBySector["Meia"]).toContain(result.current.formValues.position);
      expect(result.current.formValues.position).toBe(positionOptionsBySector["Meia"][0]);
    });

    it("ao alterar o setor mantendo uma posição compatível, preserva a posição", () => {
      const { result } = renderHook(() =>
        useSquadPlayerForm(undefined, mockCareer, mockSeason),
      );

      // Define setor Meia e posição MEI (Dani Olmo)
      act(() => {
        result.current.handleInputChange(
          { target: { value: "Meia" } } as React.ChangeEvent<HTMLSelectElement>,
          { id: "sector" } as Field,
        );
      });
      act(() => {
        result.current.handleInputChange(
          { target: { value: "MEI" } } as React.ChangeEvent<HTMLSelectElement>,
          { id: "position" } as Field,
        );
      });

      expect(result.current.formValues.position).toBe("MEI");

      // Seleciona novamente Meia: deve manter MEI
      act(() => {
        result.current.handleInputChange(
          { target: { value: "Meia" } } as React.ChangeEvent<HTMLSelectElement>,
          { id: "sector" } as Field,
        );
      });

      expect(result.current.formValues.position).toBe("MEI");
    });
  });

  describe("AddTransferPlayer - CustomSelect de Posição filtrado por Setor", () => {
    it("deve fornecer opções de posição filtradas pelo setor selecionado em getAddTransferPlayerFields", async () => {
      const { getAddTransferPlayerFields } = await import(
        "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer/constants/transferFormFields"
      );
      const fields = getAddTransferPlayerFields("ESP", "Compra", [], {}, [], undefined, false, "Ataque");
      const playerInfoSection = fields.find((s) => s.title === "Informações do Jogador");
      const positionField = playerInfoSection?.fields.flat().find((f) => f.id === "position") as { options?: string[]; disabled?: boolean } | undefined;

      expect(positionField).toBeDefined();
      expect(positionField?.options).toEqual([...positionOptionsBySector["Ataque"]]);
      expect(positionField?.disabled).toBe(false);
    });

    it("useAddTransferPlayerForm atualiza a posição automaticamente ao alterar o setor", async () => {
      const { useAddTransferPlayerForm } = await import(
        "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer/hooks/useAddTransferPlayerForm"
      );
      const onClose = vi.fn();

      const { result } = renderHook(() =>
        useAddTransferPlayerForm({
          career: mockCareer,
          season: mockSeason,
          onClose,
        }),
      );

      // Define setor Ataque via handleInputChange
      act(() => {
        result.current.handleInputChange(
          { target: { value: "Ataque" } } as React.ChangeEvent<HTMLSelectElement>,
          { id: "sector" } as Field,
        );
      });

      expect(result.current.formValues.sector).toBe("Ataque");
      expect(result.current.formValues.position).toBe(positionOptionsBySector["Ataque"][0]);

      // Altera setor para Meia: posição deve atualizar para a primeira de Meia
      act(() => {
        result.current.handleInputChange(
          { target: { value: "Meia" } } as React.ChangeEvent<HTMLSelectElement>,
          { id: "sector" } as Field,
        );
      });

      expect(result.current.formValues.sector).toBe("Meia");
      expect(result.current.formValues.position).toBe(positionOptionsBySector["Meia"][0]);
    });
  });
});
