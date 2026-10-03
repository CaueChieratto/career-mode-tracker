// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../contexts/LightThemeContext";
import { LineupTab } from "../pages/Match/components/LineupTab";
import { career as careerFactory, season as seasonFactory, match as matchFactory, player as playerFactory } from "./factories/domain";

describe("PlayerPicker Mobile Visibility & Close Button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  const p1 = playerFactory({ id: "p1", name: "Gabriel Barbosa", shirtNumber: "9", overall: 80, sell: false });
  const testSeason = seasonFactory({ id: "s1", players: [p1] });
  const testCareer = careerFactory({ id: "c1", clubData: [testSeason] });
  const testMatch = matchFactory({ matchesId: "m1" });

  it("chama onPickerOpenChange(true) ao abrir o slot e onPickerOpenChange(false) ao fechar pelo botao ✕", () => {
    const onPickerOpenChange = vi.fn();

    render(
      <ThemeProvider>
        <LineupTab
          season={testSeason}
          career={testCareer}
          match={testMatch}
          onPickerOpenChange={onPickerOpenChange}
        />
      </ThemeProvider>,
    );

    // Initial render: picker is closed
    expect(onPickerOpenChange).toHaveBeenCalledWith(false);

    // Open bench empty slot
    const addBenchBtn = screen.getByText("Adicionar jogador");
    fireEvent.click(addBenchBtn);

    // Should notify that picker is open
    expect(onPickerOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByPlaceholderText("Buscar jogador...")).toBeTruthy();

    // The close button ✕ should be visible
    const closeBtn = screen.getByRole("button", { name: "Fechar busca" });
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.textContent).toBe("✕");

    // Click close button ✕
    fireEvent.click(closeBtn);

    // Should close picker and notify that picker is closed
    expect(screen.queryByPlaceholderText("Buscar jogador...")).toBeNull();
    expect(onPickerOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("chama onPickerOpenChange(false) ao selecionar um jogador", () => {
    const onPickerOpenChange = vi.fn();

    render(
      <ThemeProvider>
        <LineupTab
          season={testSeason}
          career={testCareer}
          match={testMatch}
          onPickerOpenChange={onPickerOpenChange}
        />
      </ThemeProvider>,
    );

    // Open bench slot
    const addBenchBtn = screen.getByText("Adicionar jogador");
    fireEvent.click(addBenchBtn);
    expect(onPickerOpenChange).toHaveBeenCalledWith(true);

    // Select the player
    const playerItem = screen.getByRole("button", { name: /Gabriel Barbosa/ });
    fireEvent.click(playerItem);

    // Should close picker and notify false
    expect(screen.queryByPlaceholderText("Buscar jogador...")).toBeNull();
    expect(onPickerOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("limpa o estado chamando onPickerOpenChange(false) ao desmontar LineupTab com picker aberto", () => {
    const onPickerOpenChange = vi.fn();

    const { unmount } = render(
      <ThemeProvider>
        <LineupTab
          season={testSeason}
          career={testCareer}
          match={testMatch}
          onPickerOpenChange={onPickerOpenChange}
        />
      </ThemeProvider>,
    );

    const addBenchBtn = screen.getByText("Adicionar jogador");
    fireEvent.click(addBenchBtn);
    expect(onPickerOpenChange).toHaveBeenCalledWith(true);

    unmount();
    expect(onPickerOpenChange).toHaveBeenLastCalledWith(false);
  });
});
