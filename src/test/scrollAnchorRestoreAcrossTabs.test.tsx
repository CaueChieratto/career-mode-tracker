// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrollAnchorRestore } from "../common/hooks/useScrollAnchorRestore";
import { NavigationSessionStore } from "../common/services/NavigationSessionStore";

describe("Item 4 - Restauração Contextual de Scroll Suave nas 4 Abas (Padrão FC Barcelona)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("não executa scroll se não houver âncora salva para a viewKey", () => {
    const scrollMock = vi.fn();
    const div = document.createElement("div");
    div.id = "player-row-pedri";
    div.scrollIntoView = scrollMock;
    document.body.appendChild(div);

    renderHook(() => useScrollAnchorRestore("squad"));

    expect(scrollMock).not.toHaveBeenCalled();
  });

  it("restaura scroll para SquadTab ao encontrar #player-row-{playerId}", async () => {
    const scrollMock = vi.fn();
    const div = document.createElement("div");
    div.id = "player-row-pedri";
    div.scrollIntoView = scrollMock;
    document.body.appendChild(div);

    NavigationSessionStore.saveClickAnchor("squad", {
      scrollY: 0,
      anchorSelector: "#player-row-pedri",
      updatedAt: Date.now(),
    });

    renderHook(() => useScrollAnchorRestore("squad"));

    // Espera requestAnimationFrame
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(scrollMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });

    // Garante que o consumo foi one-shot
    expect(NavigationSessionStore.consumeClickAnchor("squad")).toBeNull();
  });

  it("restaura scroll para AllMatchesTab ao encontrar #match-card-{matchesId}", async () => {
    const scrollMock = vi.fn();
    const matchCard = document.createElement("div");
    matchCard.id = "match-card-el-clasico-2026";
    matchCard.scrollIntoView = scrollMock;
    document.body.appendChild(matchCard);

    NavigationSessionStore.saveClickAnchor("all_matches", {
      scrollY: 0,
      anchorSelector: "#match-card-el-clasico-2026",
      updatedAt: Date.now(),
    });

    renderHook(() => useScrollAnchorRestore("all_matches"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(scrollMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("restaura scroll para TableTab ao encontrar #table-row-{teamId}", async () => {
    const scrollMock = vi.fn();
    const tableRow = document.createElement("tr");
    tableRow.id = "table-row-barcelona-fc";
    tableRow.scrollIntoView = scrollMock;
    document.body.appendChild(tableRow);

    NavigationSessionStore.saveClickAnchor("table", {
      scrollY: 0,
      anchorSelector: "#table-row-barcelona-fc",
      updatedAt: Date.now(),
    });

    renderHook(() => useScrollAnchorRestore("table"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(scrollMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("restaura scroll para StatsTab_Club ao encontrar #player-stat-{playerId}", async () => {
    const scrollMock = vi.fn();
    const statCard = document.createElement("div");
    statCard.id = "player-stat-lamine-yamal";
    statCard.scrollIntoView = scrollMock;
    document.body.appendChild(statCard);

    NavigationSessionStore.saveClickAnchor("stats", {
      scrollY: 0,
      anchorSelector: "#player-stat-lamine-yamal",
      updatedAt: Date.now(),
    });

    renderHook(() => useScrollAnchorRestore("stats"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(scrollMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("tenta novamente caso o elemento seja adicionado ao DOM com leve atraso de renderização", async () => {
    const scrollMock = vi.fn();

    NavigationSessionStore.saveClickAnchor("squad", {
      scrollY: 0,
      anchorSelector: "#player-row-gavi",
      updatedAt: Date.now(),
    });

    renderHook(() => useScrollAnchorRestore("squad"));

    // Ainda não existe no primeiro tick
    expect(scrollMock).not.toHaveBeenCalled();

    // Elemento é adicionado assincronamente ao DOM (simulando mount de lista)
    const gaviDiv = document.createElement("div");
    gaviDiv.id = "player-row-gavi";
    gaviDiv.scrollIntoView = scrollMock;
    document.body.appendChild(gaviDiv);

    // Espera o retry
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(scrollMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("preserva a âncora pendente através de múltiplos re-renders de dependências até o elemento surgir", async () => {
    const scrollMock = vi.fn();

    NavigationSessionStore.saveClickAnchor("squad", {
      scrollY: 0,
      anchorSelector: "#player-row-cubarsi",
      updatedAt: Date.now(),
    });

    let dataDependency = ["initial-data", "step-1"];
    const { rerender } = renderHook(
      ({ deps }) => useScrollAnchorRestore("squad", deps),
      { initialProps: { deps: dataDependency } },
    );

    // Primeiro render sem elemento
    expect(scrollMock).not.toHaveBeenCalled();

    // Re-render ocorre porque dados assíncronos chegaram (dependencies mudam mantendo tamanho do array)
    dataDependency = ["initial-data", "step-2"];
    rerender({ deps: dataDependency });

    // Elemento é adicionado ao DOM
    const cubarsiDiv = document.createElement("div");
    cubarsiDiv.id = "player-row-cubarsi";
    cubarsiDiv.scrollIntoView = scrollMock;
    document.body.appendChild(cubarsiDiv);

    // Re-render adicional disparado após mount dos filhos
    rerender({ deps: ["final-render", "step-3"] });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });

    expect(scrollMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });
});
