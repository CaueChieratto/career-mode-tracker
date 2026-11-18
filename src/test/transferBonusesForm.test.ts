// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTransferBonusesForm } from "../layout/SectionView/hooks/useTransferBonusesForm";
import type { TransferBonus } from "../common/interfaces/playersInfo/transferTerms";

describe("useTransferBonusesForm (FC Barcelona)", () => {
  const mockBarcaBonusYamalBallonDor: TransferBonus = {
    id: "bonus_yamal_ballondor",
    direction: "payable",
    category: "award",
    bonusCategory: "Prêmio",
    name: "Bola de Ouro",
    bonusTarget: "Bola de Ouro",
    targetObjective: "Bola de Ouro",
    value: 5000000,
    status: "pending",
    partnerClub: "FC Barcelona",
  };

  const mockBarcaBonusPedriMatches: TransferBonus = {
    id: "bonus_pedri_matches",
    direction: "payable",
    category: "performance",
    bonusCategory: "Desempenho",
    name: "Partidas",
    bonusTarget: "30 partidas na temporada",
    targetObjective: "30 partidas na temporada",
    metric: "matches",
    metricTarget: 30,
    value: 1000000,
    status: "pending",
    partnerClub: "FC Barcelona",
  };

  const mockBarcaBonusGaviUCL: TransferBonus = {
    id: "bonus_gavi_ucl",
    direction: "payable",
    category: "objective",
    bonusCategory: "Objetivo atingido",
    name: "Conquistar o título nos playoffs",
    bonusTarget: "Conquistar o título nos playoffs",
    targetObjective: "Conquistar o título nos playoffs",
    value: 2000000,
    status: "pending",
    partnerClub: "FC Barcelona",
  };

  it("inicia com estado vazio por default e sem edicao ativa", () => {
    const { result } = renderHook(() => useTransferBonusesForm());

    expect(result.current.bonuses).toEqual([]);
    expect(result.current.editingBonusIndex).toBeNull();
  });

  it("inicia com lista pre-carregada de bonus de atletas do FC Barcelona", () => {
    const { result } = renderHook(() =>
      useTransferBonusesForm([mockBarcaBonusYamalBallonDor]),
    );

    expect(result.current.bonuses).toHaveLength(1);
    expect(result.current.bonuses[0].name).toBe("Bola de Ouro");
    expect(result.current.bonuses[0].value).toBe(5000000);
  });

  it("adiciona novos bonus contratuais com sucesso", () => {
    const { result } = renderHook(() =>
      useTransferBonusesForm([mockBarcaBonusYamalBallonDor]),
    );

    let added: boolean | undefined;
    act(() => {
      added = result.current.handleAddOrEditBonus(mockBarcaBonusPedriMatches);
    });

    expect(added).toBe(true);
    expect(result.current.bonuses).toHaveLength(2);
    expect(result.current.bonuses[1].id).toBe("bonus_pedri_matches");
    expect(result.current.editingBonusIndex).toBeNull();
  });

  it("edita um bonus existente por indice e limpa o editingBonusIndex", () => {
    const { result } = renderHook(() =>
      useTransferBonusesForm([
        mockBarcaBonusYamalBallonDor,
        mockBarcaBonusPedriMatches,
      ]),
    );

    act(() => {
      result.current.handleEditBonus(1);
    });
    expect(result.current.editingBonusIndex).toBe(1);

    const updatedBonus: TransferBonus = {
      ...mockBarcaBonusPedriMatches,
      value: 1500000,
      metricTarget: 35,
    };

    let saved: boolean | undefined;
    act(() => {
      saved = result.current.handleAddOrEditBonus(updatedBonus);
    });

    expect(saved).toBe(true);
    expect(result.current.bonuses).toHaveLength(2);
    expect(result.current.bonuses[1].value).toBe(1500000);
    expect(result.current.bonuses[1].metricTarget).toBe(35);
    expect(result.current.editingBonusIndex).toBeNull();
  });

  it("bloqueia adicao de bonus duplicado com o mesmo objetivo na mesma categoria", () => {
    const { result } = renderHook(() =>
      useTransferBonusesForm([mockBarcaBonusYamalBallonDor]),
    );

    const duplicateBonus: TransferBonus = {
      ...mockBarcaBonusYamalBallonDor,
      id: "bonus_yamal_second_ballondor",
      value: 7000000,
    };

    let added: boolean | undefined;
    act(() => {
      added = result.current.handleAddOrEditBonus(duplicateBonus);
    });

    expect(added).toBe(false);
    expect(result.current.bonuses).toHaveLength(1);
  });

  it("permite salvar o proprio item durante a edicao sem falso positivo de duplicata", () => {
    const { result } = renderHook(() =>
      useTransferBonusesForm([
        mockBarcaBonusYamalBallonDor,
        mockBarcaBonusGaviUCL,
      ]),
    );

    act(() => {
      result.current.handleEditBonus(0);
    });

    const modifiedSameBonus: TransferBonus = {
      ...mockBarcaBonusYamalBallonDor,
      value: 6000000,
    };

    let saved: boolean | undefined;
    act(() => {
      saved = result.current.handleAddOrEditBonus(modifiedSameBonus);
    });

    expect(saved).toBe(true);
    expect(result.current.bonuses[0].value).toBe(6000000);
  });

  it("exclui um bonus da lista pelo indice e ajusta o editingBonusIndex", () => {
    const { result } = renderHook(() =>
      useTransferBonusesForm([
        mockBarcaBonusYamalBallonDor,
        mockBarcaBonusPedriMatches,
        mockBarcaBonusGaviUCL,
      ]),
    );

    act(() => {
      result.current.handleEditBonus(2);
    });
    expect(result.current.editingBonusIndex).toBe(2);

    act(() => {
      result.current.handleDeleteBonus(0);
    });

    expect(result.current.bonuses).toHaveLength(2);
    expect(result.current.bonuses[0].id).toBe("bonus_pedri_matches");
    expect(result.current.bonuses[1].id).toBe("bonus_gavi_ucl");
    expect(result.current.editingBonusIndex).toBe(1);

    act(() => {
      result.current.handleDeleteBonus(1);
    });
    expect(result.current.bonuses).toHaveLength(1);
    expect(result.current.editingBonusIndex).toBeNull();
  });

  it("reseta a lista com novos valores e zera edicao", () => {
    const { result } = renderHook(() =>
      useTransferBonusesForm([mockBarcaBonusYamalBallonDor]),
    );

    act(() => {
      result.current.handleEditBonus(0);
      result.current.resetBonuses([mockBarcaBonusGaviUCL]);
    });

    expect(result.current.bonuses).toHaveLength(1);
    expect(result.current.bonuses[0].id).toBe("bonus_gavi_ucl");
    expect(result.current.editingBonusIndex).toBeNull();
  });
});
