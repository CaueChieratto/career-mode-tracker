// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ClauseSectionDrawer } from "../components/ClauseSectionDrawer";

describe("ClauseSectionDrawer - Blindagem Mobile (Inert, Viewport e Interações)", () => {
  beforeEach(() => {
    // Cria elemento container simulando a tela de trás (Hub)
    const hub = document.createElement("div");
    hub.id = "mainClauseHubContainer";
    hub.innerHTML = "<button id='testBackgroundBtn'>Botão no Fundo</button>";
    document.body.appendChild(hub);
  });

  afterEach(() => {
    cleanup();
    document.body.className = "";
    document.body.style.overflow = "";
    const hub = document.getElementById("mainClauseHubContainer");
    if (hub) {
      hub.remove();
    }
  });

  it("não renderiza nada quando isOpen é false", () => {
    render(
      <ClauseSectionDrawer isOpen={false} onClose={vi.fn()} title="Test Drawer">
        <p>Conteúdo Interno</p>
      </ClauseSectionDrawer>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Test Drawer")).toBeNull();
  });

  it("renderiza cabeçalho, conteúdo e botões de Salvar e Cancelar quando isOpen é true", () => {
    render(
      <ClauseSectionDrawer
        isOpen={true}
        onClose={vi.fn()}
        title="Parcelamento Financeiro"
      >
        <p>Configuração de Parcelas</p>
      </ClauseSectionDrawer>,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Parcelamento Financeiro")).toBeTruthy();
    expect(screen.getByText("Configuração de Parcelas")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("aplica classe modal-open no body e overflow hidden para contenção de scroll", () => {
    const { unmount } = render(
      <ClauseSectionDrawer isOpen={true} onClose={vi.fn()} title="Bônus">
        <p>Conteúdo</p>
      </ClauseSectionDrawer>,
    );

    expect(document.body.classList.contains("modal-open")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.classList.contains("modal-open")).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("aplica atributo 'inert' e 'pointer-events: none' no container Hub anterior para prevenir ghost clicks", () => {
    const hub = document.getElementById("mainClauseHubContainer")!;

    const { unmount } = render(
      <ClauseSectionDrawer
        isOpen={true}
        onClose={vi.fn()}
        title="Atleta de Troca"
        hubContainerId="mainClauseHubContainer"
      >
        <p>Dados da Troca</p>
      </ClauseSectionDrawer>,
    );

    expect(hub.hasAttribute("inert")).toBe(true);
    expect(hub.style.pointerEvents).toBe("none");

    unmount();

    expect(hub.hasAttribute("inert")).toBe(false);
    expect(hub.style.pointerEvents).toBe("");
  });

  it("dispara callback onClose ao clicar no botão fechar (X), no overlay e no botão de confirmação", () => {
    const onCloseSpy = vi.fn();

    render(
      <ClauseSectionDrawer
        isOpen={true}
        onClose={onCloseSpy}
        title="Outras Cláusulas"
        confirmLabel="Salvar Cláusula"
      >
        <p>Termos</p>
      </ClauseSectionDrawer>,
    );

    // 1. Clicar no botão fechar (X)
    const closeBtn = screen.getByRole("button", { name: "Fechar" });
    fireEvent.click(closeBtn);
    expect(onCloseSpy).toHaveBeenCalledTimes(1);

    // 2. Clicar no botão de confirmação
    const confirmBtn = screen.getByRole("button", { name: "Salvar Cláusula" });
    fireEvent.click(confirmBtn);
    expect(onCloseSpy).toHaveBeenCalledTimes(2);

    // 3. Clicar no overlay
    const overlay = screen.getByTestId("clause-section-drawer-overlay");
    fireEvent.click(overlay);
    expect(onCloseSpy).toHaveBeenCalledTimes(3);
  });
});
