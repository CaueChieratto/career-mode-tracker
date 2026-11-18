// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { AddPlayerChoiceModal } from "../layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements/Section/ui/AddPlayerChoiceModal";

describe("AddPlayerChoiceModal", () => {
  const onClose = vi.fn();
  const onSelectElenco = vi.fn();
  const onSelectTransferencia = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    document.body.innerHTML = "";
    document.body.className = "";
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    document.body.className = "";
  });

  it("renderiza o título 'Adicionar Jogador' e as opções 'Elenco' e 'Transferência'", () => {
    render(
      <AddPlayerChoiceModal
        onClose={onClose}
        onSelectElenco={onSelectElenco}
        onSelectTransferencia={onSelectTransferencia}
      />,
    );

    expect(screen.getByText("Adicionar Jogador")).not.toBeNull();
    expect(screen.getByText("Elenco")).not.toBeNull();
    expect(screen.getByText("Transferência")).not.toBeNull();
  });

  it("não exibe o botão de confirmação antes de qualquer seleção", () => {
    render(
      <AddPlayerChoiceModal
        onClose={onClose}
        onSelectElenco={onSelectElenco}
        onSelectTransferencia={onSelectTransferencia}
      />,
    );

    expect(screen.queryByText(/Adicionar Elenco/i)).toBeNull();
    expect(screen.queryByText(/Adicionar Transfer[eê]ncia/i)).toBeNull();
  });

  it("exibe o botão 'Adicionar Elenco' ao selecionar o card Elenco", () => {
    render(
      <AddPlayerChoiceModal
        onClose={onClose}
        onSelectElenco={onSelectElenco}
        onSelectTransferencia={onSelectTransferencia}
      />,
    );

    fireEvent.click(screen.getByText("Elenco"));
    expect(screen.getByText("Adicionar Elenco")).not.toBeNull();
  });

  it("aciona onSelectElenco e onClose ao confirmar opção de Elenco", () => {
    render(
      <AddPlayerChoiceModal
        onClose={onClose}
        onSelectElenco={onSelectElenco}
        onSelectTransferencia={onSelectTransferencia}
      />,
    );

    fireEvent.click(screen.getByText("Elenco"));
    fireEvent.click(screen.getByText("Adicionar Elenco"));

    expect(onSelectElenco).toHaveBeenCalledTimes(1);
    expect(onSelectTransferencia).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exibe 'Adicionar Transferência' e aciona onSelectTransferencia ao confirmar", () => {
    render(
      <AddPlayerChoiceModal
        onClose={onClose}
        onSelectElenco={onSelectElenco}
        onSelectTransferencia={onSelectTransferencia}
      />,
    );

    fireEvent.click(screen.getByText("Transferência"));
    const confirmBtn = screen.getByText("Adicionar Transferência");
    expect(confirmBtn).not.toBeNull();

    fireEvent.click(confirmBtn);
    expect(onSelectTransferencia).toHaveBeenCalledTimes(1);
    expect(onSelectElenco).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("chama onClose e limpa a classe modal-open do body ao fechar o modal via overlay", () => {
    vi.useFakeTimers();
    document.body.classList.add("modal-open");
    render(
      <AddPlayerChoiceModal
        onClose={onClose}
        onSelectElenco={onSelectElenco}
        onSelectTransferencia={onSelectTransferencia}
      />,
    );

    const overlay = document.querySelector("div[class*='overlay']");
    expect(overlay).not.toBeNull();
    if (overlay) {
      fireEvent.click(overlay);
      act(() => {
        vi.runAllTimers();
      });
      expect(onClose).toHaveBeenCalled();
      expect(document.body.classList.contains("modal-open")).toBe(false);
    }
    vi.useRealTimers();
  });
});

