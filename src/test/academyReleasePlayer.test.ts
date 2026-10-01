import { describe, expect, it } from "vitest";
import { academyPlayer, deepFreeze } from "./factories/domain";
import { buildReleasedAcademyPlayerUpdate } from "../pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildReleasedAcademyPlayerUpdate";

describe("academy player release update", () => {
  it("preserves the player history while marking the shirt number for deletion", () => {
    const source = deepFreeze(academyPlayer());
    const deleteField = { __op: "deleteField" };

    const update = buildReleasedAcademyPlayerUpdate(
      source,
      "03/08/2024",
      deleteField,
    );

    expect(update).toMatchObject({
      status: "released",
      exitDate: "03/08/2024",
      shirtNumber: deleteField,
      evolutionHistory: expect.arrayContaining([
        ...source.evolutionHistory,
        expect.objectContaining({
          oldValue: "academy",
          newValue: "released",
        }),
      ]),
    });
    expect(source).toEqual(academyPlayer());
  });
});
