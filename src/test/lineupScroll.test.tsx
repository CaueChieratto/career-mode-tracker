// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { scheduleLineupSlotScroll } from "../pages/Match/components/LineupTab/services/scheduleLineupSlotScroll";
import { EmptySlotRow } from "../pages/Match/components/LineupTab/layouts/Bottom/components/EmptySlotRow";

describe("Lineup Scroll Dynamics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    document.body.innerHTML = "";
  });

  it("ao adicionar um jogador no banco e ainda ter espaço para adicionar outros, rola até o botão de adicionar", () => {
    const scrollIntoViewBtnMock = vi.fn();
    const scrollIntoViewSlotMock = vi.fn();

    // Elemento do jogador recém-adicionado no banco
    const benchSlotEl = document.createElement("div");
    benchSlotEl.setAttribute("data-slot-id", "bench-0");
    benchSlotEl.scrollIntoView = scrollIntoViewSlotMock;

    // Botão de adicionar o próximo jogador no banco (EmptySlotRow)
    const addBtnEl = document.createElement("button");
    addBtnEl.setAttribute("data-bench-add-button", "true");
    addBtnEl.className = "EmptySlotRow_empty_avatar__abc";
    addBtnEl.scrollIntoView = scrollIntoViewBtnMock;

    document.body.appendChild(benchSlotEl);
    document.body.appendChild(addBtnEl);

    scheduleLineupSlotScroll("bench-0");
    vi.advanceTimersByTime(160);

    expect(scrollIntoViewBtnMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewBtnMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
    expect(scrollIntoViewSlotMock).not.toHaveBeenCalled();
  });

  it("ao adicionar um jogador no banco e não ter mais espaço (banco cheio), rola até o último jogador adicionado", () => {
    const scrollIntoViewLastPlayerMock = vi.fn();

    // Elemento do último jogador adicionado no banco
    const benchSlotEl = document.createElement("div");
    benchSlotEl.setAttribute("data-slot-id", "bench-8");
    benchSlotEl.scrollIntoView = scrollIntoViewLastPlayerMock;

    // Nenhum botão de adicionar no banco existe no DOM (banco cheio)
    document.body.appendChild(benchSlotEl);

    scheduleLineupSlotScroll("bench-8");
    vi.advanceTimersByTime(160);

    expect(scrollIntoViewLastPlayerMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewLastPlayerMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("para os titulares (campo), rola diretamente para a posição que o jogador foi", () => {
    const scrollIntoViewStarterMock = vi.fn();
    const scrollIntoViewBtnMock = vi.fn();

    // Posição de titular no campo
    const starterSlotEl = document.createElement("div");
    starterSlotEl.setAttribute("data-slot-id", "slot-mid-0");
    starterSlotEl.scrollIntoView = scrollIntoViewStarterMock;

    // Botão de adicionar no banco presente no DOM
    const addBtnEl = document.createElement("button");
    addBtnEl.setAttribute("data-bench-add-button", "true");
    addBtnEl.scrollIntoView = scrollIntoViewBtnMock;

    document.body.appendChild(starterSlotEl);
    document.body.appendChild(addBtnEl);

    scheduleLineupSlotScroll("slot-mid-0");
    vi.advanceTimersByTime(160);

    expect(scrollIntoViewStarterMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewStarterMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
    expect(scrollIntoViewBtnMock).not.toHaveBeenCalled();
  });

  it("EmptySlotRow não dispara scrollIntoView invasivo ao montar ou atualizar", () => {
    const scrollIntoViewSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    const { rerender } = render(
      <EmptySlotRow slotId="bench-0" isActive={false} onSelect={vi.fn()} />
    );

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    rerender(
      <EmptySlotRow slotId="bench-1" isActive={false} onSelect={vi.fn()} />
    );

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });
});

