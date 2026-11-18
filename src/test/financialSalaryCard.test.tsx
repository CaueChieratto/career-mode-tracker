// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import FinancialEntryCard from "../layout/SectionView/features/ClubTabs/FinanceTab/views/AddFinancialEntry/components/FinancialEntryCard";
import { FinancialEntry } from "../common/interfaces/finance";

describe("FinancialEntryCard: Ações para Despesa Automática de Salários (Padrão FC Barcelona)", () => {
  afterEach(() => {
    cleanup();
  });
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onRedirect = vi.fn();

  it("Exibe botão 'Editar' e NUNCA exibe 'Excluir' ou 'Redirecionar' para despesas automáticas de salários (source === 'salary')", () => {
    const salaryEntry: FinancialEntry = {
      id: "salary_season_season_fcb_1",
      type: "expense",
      category: "Salários de atletas",
      amount: 14000000,
      calculatedAmount: 12000000,
      manualAdjustment: 2000000,
      isAutomatic: true,
      source: "salary",
      description: "Salários de atletas (01/07 a 15/10)",
    };

    render(
      <FinancialEntryCard
        entry={salaryEntry}
        currency="EUR"
        onEdit={onEdit}
        onDelete={onDelete}
        onRedirect={onRedirect}
      />,
    );

    // Botão Editar deve estar visível
    const editBtn = screen.getByRole("button", {
      name: /Editar lançamento Salários de atletas/i,
    });
    expect(editBtn).toBeTruthy();

    // Botão Excluir NÃO PODE existir
    expect(
      screen.queryByRole("button", {
        name: /Excluir lançamento Salários de atletas/i,
      }),
    ).toBeNull();

    // Botões de redirecionamento NÃO PODEM existir
    expect(screen.queryByText(/Ver em Transferências/i)).toBeNull();
    expect(screen.queryByText(/Ver em Cláusulas/i)).toBeNull();
  });

  it("Exibe tanto 'Editar' quanto 'Excluir' para lançamentos manuais", () => {
    const manualEntry: FinancialEntry = {
      id: "manual_merchandising_fcb",
      type: "revenue",
      category: "Merchandising",
      amount: 5000000,
      isAutomatic: false,
      source: "manual",
    };

    render(
      <FinancialEntryCard
        entry={manualEntry}
        currency="EUR"
        onEdit={onEdit}
        onDelete={onDelete}
        onRedirect={onRedirect}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /Editar lançamento Merchandising/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /Excluir lançamento Merchandising/i,
      }),
    ).toBeTruthy();
  });

  it("Exibe 'Ver em Transferências' e não exibe 'Editar' ou 'Excluir' para compras de atletas", () => {
    const transferEntry: FinancialEntry = {
      id: "transfer_buy_dani_olmo",
      type: "expense",
      category: "Transferências (compras de atletas)",
      amount: 55000000,
      isAutomatic: true,
      source: "transfer",
    };

    render(
      <FinancialEntryCard
        entry={transferEntry}
        currency="EUR"
        onEdit={onEdit}
        onDelete={onDelete}
        onRedirect={onRedirect}
      />,
    );

    expect(screen.getByText(/Ver em Transferências/i)).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: /Editar lançamento/i,
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: /Excluir lançamento/i,
      }),
    ).toBeNull();
  });
});
