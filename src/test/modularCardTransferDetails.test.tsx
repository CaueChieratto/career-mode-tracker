// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ModularClausesGrid } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/components/ModularClausesGrid";
import { FormValues } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/types";

describe("ModularClausesGrid - Card 0 Detalhes de Transferência (Padrão FC Barcelona)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const baseFormValues: FormValues = {
    timing: "Imediata",
    sellValue: "65M",
    buyValue: "",
    transferFee: "65M",
  };

  it("renderiza o Card 0 quando onOpenTransferDetails for fornecido e exibe o subtítulo com 5 Módulos Operacionais", () => {
    const onOpenTransferDetails = vi.fn();

    render(
      <ModularClausesGrid
        formValues={baseFormValues}
        bonuses={[]}
        currency="€"
        mode="transfer"
        direction="exit"
        onOpenTransferDetails={onOpenTransferDetails}
        onOpenInstallments={vi.fn()}
        onOpenPlayerSwap={vi.fn()}
        onOpenBonus={vi.fn()}
        onOpenOtherClauses={vi.fn()}
      />,
    );

    // Subtítulo atualizado
    expect(
      screen.getByText("5 Módulos Operacionais (Clube)"),
    ).toBeDefined();

    // Card 0
    const card0 = screen.getByTestId("modular-card-transfer-details");
    expect(card0).toBeDefined();
    expect(
      screen.getByText("0. Data de Saída & Taxa de Transferência"),
    ).toBeDefined();
    expect(screen.getAllByText("€65M").length).toBeGreaterThanOrEqual(1);

    // Clique no Card 0
    fireEvent.click(card0);
    expect(onOpenTransferDetails).toHaveBeenCalledTimes(1);
  });

  it("renderiza título de Momento em chegadas (direction: 'arrivals')", () => {
    const onOpenTransferDetails = vi.fn();

    render(
      <ModularClausesGrid
        formValues={{
          timing: "Proxima Janela",
          buyValue: "40M",
          transferFee: "40M",
        }}
        bonuses={[]}
        currency="€"
        mode="transfer"
        direction="arrivals"
        hidePlayerCards={true}
        onOpenTransferDetails={onOpenTransferDetails}
        onOpenInstallments={vi.fn()}
        onOpenPlayerSwap={vi.fn()}
        onOpenBonus={vi.fn()}
        onOpenOtherClauses={vi.fn()}
      />,
    );

    expect(
      screen.getByText("0. Momento & Taxa de Transferência"),
    ).toBeDefined();
    expect(screen.getByText("Proxima Janela")).toBeDefined();
    expect(screen.getAllByText("€40M").length).toBeGreaterThanOrEqual(1);
  });

  it("não renderiza o Card 0 se onOpenTransferDetails for undefined", () => {
    render(
      <ModularClausesGrid
        formValues={baseFormValues}
        bonuses={[]}
        currency="€"
        mode="transfer"
        direction="exit"
        onOpenInstallments={vi.fn()}
        onOpenPlayerSwap={vi.fn()}
        onOpenBonus={vi.fn()}
        onOpenOtherClauses={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("modular-card-transfer-details")).toBeNull();
    expect(screen.getByText("4 Módulos Operacionais")).toBeDefined();
  });
});
