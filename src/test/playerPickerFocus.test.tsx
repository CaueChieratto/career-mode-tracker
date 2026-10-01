// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Players } from "../common/interfaces/playersInfo/players";
import { PlayerPicker } from "../pages/Match/components/LineupTab/components/PlayerPicker";

const player = {
  id: "player-1",
  name: "Jogador Teste",
  position: "ATA",
  shirtNumber: "9",
  overall: 80,
  sell: false,
} as Players;

const assignedIds = new Set<string>();

const PickerHarness = () => {
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  return (
    <>
      <button type="button" onClick={() => setActiveSlotId("slot-1")}>
        Abrir slot 1
      </button>
      <button type="button" onClick={() => setActiveSlotId("slot-2")}>
        Abrir slot 2
      </button>
      <button type="button" onClick={() => setActiveSlotId(null)}>
        Fechar
      </button>
      {activeSlotId && (
        <PlayerPicker
          players={[player]}
          assignedIds={assignedIds}
          activeSlotId={activeSlotId}
          onSelect={() => setActiveSlotId(null)}
        />
      )}
    </>
  );
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PlayerPicker autofocus", () => {
  it("foca ao abrir, fecha e foca novamente ao reabrir", () => {
    render(<PickerHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir slot 1" }));
    expect(document.activeElement).toBe(
      screen.getByPlaceholderText("Buscar jogador..."),
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByPlaceholderText("Buscar jogador...")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir slot 1" }));
    expect(document.activeElement).toBe(
      screen.getByPlaceholderText("Buscar jogador..."),
    );
  });

  it("refoca ao selecionar um jogador e abrir outro slot", () => {
    render(<PickerHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir slot 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Jogador Teste/ }));
    expect(screen.queryByPlaceholderText("Buscar jogador...")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir slot 2" }));
    expect(document.activeElement).toBe(
      screen.getByPlaceholderText("Buscar jogador..."),
    );
  });

  it("refoca na troca direta de slot sem refocar durante a digitação", () => {
    const focusSpy = vi.spyOn(HTMLInputElement.prototype, "focus");
    render(<PickerHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir slot 1" }));
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });

    fireEvent.change(screen.getByPlaceholderText("Buscar jogador..."), {
      target: { value: "Teste" },
    });
    expect(focusSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Abrir slot 2" }));
    expect(document.activeElement).toBe(
      screen.getByPlaceholderText("Buscar jogador..."),
    );
    expect(focusSpy).toHaveBeenCalledTimes(2);
  });

  it("nao rouba foco quando a aba do navegador esta invisivel", () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const focusSpy = vi.spyOn(HTMLInputElement.prototype, "focus");

    render(
      <PlayerPicker
        players={[player]}
        assignedIds={assignedIds}
        activeSlotId="slot-1"
        onSelect={vi.fn()}
      />,
    );

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it("mantem o scroll existente e limpa seu timer ao fechar", () => {
    vi.useFakeTimers();
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    const { unmount } = render(
      <PlayerPicker
        players={[player]}
        assignedIds={assignedIds}
        activeSlotId="slot-1"
        onSelect={vi.fn()}
      />,
    );

    vi.advanceTimersByTime(150);
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({
      top: -274,
      behavior: "smooth",
    });

    scrollTo.mockClear();
    unmount();
    vi.advanceTimersByTime(150);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("cancela o scroll pendente quando fecha antes do atraso", () => {
    vi.useFakeTimers();
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    render(<PickerHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir slot 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    vi.advanceTimersByTime(150);

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
