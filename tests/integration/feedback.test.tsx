// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useLineupPersistence } from "../../src/pages/Match/components/LineupTab/hooks/useLineupPersistence";
import { lineup, match } from "../../src/test/factories/domain";
import { failOnce, matchPath, put, read, seedCareer } from "./helpers";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ careerId: "c1", seasonId: "s1" }),
}));
afterEach(cleanup);
it.each([false, true])(
  "[B11] erro real preserva estado salvo existente=%s; nova tentativa confirma no servidor",
  async (existing) => {
    const previous = lineup({ formation: "4-3-3" });
    const initial = match(existing ? { lineup: previous } : {});
    await seedCareer();
    await put(matchPath(), initial);
    failOnce("setDoc", "/matches/m1", "before", "permission-denied");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("alert", vi.fn());
    const onSaved = vi.fn();
    const draft = lineup();
    const before = structuredClone(draft);
    let save: (() => void | Promise<void>) | undefined;
    const { result } = renderHook(() =>
      useLineupPersistence({
        match: initial,
        buildSavedLineup: () => draft,
        onRegisterSave: (handler) => {
          save = handler;
        },
        onSaved,
      }),
    );
    await act(async () => {
      await save!();
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledOnce();
    expect(result.current.getSavedLineup()).toEqual(
      existing ? previous : undefined,
    );
    expect(await read(matchPath())).toEqual(initial);
    expect(draft).toEqual(before);
    await act(async () => {
      await save!();
    });
    expect(onSaved).toHaveBeenCalledExactlyOnceWith({
      lineup: draft,
      playerStats: [],
    });
    expect(result.current.getSavedLineup()).toBe(draft);
    expect((await read(matchPath()))!.lineup).toEqual(draft);
    vi.unstubAllGlobals();
  },
);
