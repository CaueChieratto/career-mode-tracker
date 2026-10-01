// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSavePlayerStats } from "../pages/Match/components/LineupTab/views/AddMatchStatsPlayer/hooks/useSavePlayerStats";
import { savePlayerMatchStats } from "../pages/Match/components/LineupTab/views/AddMatchStatsPlayer/services/savePlayerMatchStats";
import { career, match, player, season } from "./factories/domain";

vi.mock(
  "../pages/Match/components/LineupTab/views/AddMatchStatsPlayer/services/savePlayerMatchStats",
  () => ({ savePlayerMatchStats: vi.fn() }),
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("falha de escrita é tratada, mantém editor aberto e permite nova tentativa", async () => {
  const failure = new Error("quota");
  vi.mocked(savePlayerMatchStats)
    .mockRejectedValueOnce(failure)
    .mockResolvedValueOnce({ updatedPlayerStats: [] });
  const onClose = vi.fn();
  const onSaved = vi.fn();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { result } = renderHook(() =>
    useSavePlayerStats({
      career: career(),
      season: season(),
      match: match(),
      player: player(),
      formValues: { matchGoals: "2" },
      booleanValues: {},
      onClose,
      onSaved,
    }),
  );

  await act(async () => {
    await expect(result.current.savePlayerStats()).resolves.toBeUndefined();
  });
  expect(result.current.isSaving).toBe(false);
  expect(onClose).not.toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
  expect(window.alert).toHaveBeenCalledTimes(1);

  await act(async () => {
    await result.current.savePlayerStats();
  });
  expect(onSaved).toHaveBeenCalledWith({ playerStats: [] });
  expect(onClose).toHaveBeenCalledTimes(1);
});
