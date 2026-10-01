// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAddDetails } from "../pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/useAddDetails";
import { useAddStatsMatch } from "../pages/Match/components/MatchStatsTab/views/AddStatsMatch/hooks/useAddStatsMatch";
import { ServiceMatches } from "../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { career, match, season } from "./factories/domain";

vi.mock(
  "../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches",
  () => ({
    ServiceMatches: {
      updateMatchDetailsInSeason: vi.fn(),
      updateMatchStatsInSeason: vi.fn(),
    },
  }),
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("falhas ao reconciliar partida", () => {
  it.each(["resource-exhausted", "aborted"])(
    "propaga %s sem fechar nem afirmar sucesso",
    async (code) => {
      const failure = Object.assign(new Error(`Firestore ${code}`), { code });
      vi.mocked(ServiceMatches.updateMatchDetailsInSeason).mockRejectedValueOnce(
        failure,
      );
      const onClose = vi.fn();
      const onSaved = vi.fn();
      const testSeason = season({
        leagues: [{ name: "Liga", trophy: "", logo: "", league: true }],
      });
      const { result } = renderHook(() =>
        useAddDetails({
          career: career({ clubData: [testSeason] }),
          season: testSeason,
          match: match(),
          onClose,
          onSaved,
        }),
      );
      let received: unknown;

      await act(async () => {
        try {
          await result.current.saveDetails();
        } catch (error) {
          received = error;
        }
      });

      expect(received).toBe(failure);
      expect(ServiceMatches.updateMatchDetailsInSeason).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
      expect(result.current.isSaving).toBe(false);
    },
  );

  it("falha de MatchStats mantém a tela aberta e não publica sucesso", async () => {
    const failure = Object.assign(new Error("Firestore resource-exhausted"), {
      code: "resource-exhausted",
    });
    vi.mocked(
      ServiceMatches.updateMatchStatsInSeason,
    ).mockRejectedValueOnce(failure);
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const testSeason = season();
    const { result } = renderHook(() =>
      useAddStatsMatch({
        career: career({ clubData: [testSeason] }),
        season: testSeason,
        match: match(),
        onClose,
        onSaved,
      }),
    );

    let received: unknown;
    await act(async () => {
      try {
        await result.current.saveStats();
      } catch (error) {
        received = error;
      }
    });

    expect(received).toBe(failure);
    expect(ServiceMatches.updateMatchStatsInSeason).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });
});
