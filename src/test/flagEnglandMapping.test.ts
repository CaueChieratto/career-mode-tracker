import { describe, it, expect } from "vitest";
import {
  FIFA_COUNTRY_CODES,
  resolveCountryFlagCode,
  getFlagCode,
} from "../common/constants/FIFA_COUNTRY_CODES";

describe("Item 6 - Mapeamento de Bandeiras Home Nations (ENG -> GB-ENG)", () => {
  it("mapeia ENG para 'GB-ENG' (Cruz de São Jorge da Inglaterra e não a Union Jack britânica)", () => {
    expect(FIFA_COUNTRY_CODES["ENG"]).toBe("GB-ENG");
    expect(resolveCountryFlagCode("ENG")).toBe("GB-ENG");
    expect(resolveCountryFlagCode("eng")).toBe("GB-ENG");
    expect(resolveCountryFlagCode(" ENG ")).toBe("GB-ENG");
    expect(resolveCountryFlagCode("Inglaterra")).toBe("GB-ENG");
    expect(resolveCountryFlagCode("England")).toBe("GB-ENG");
    expect(getFlagCode("ENG")).toBe("GB-ENG");
  });

  it("mapeia as outras nações britânicas para seus códigos específicos", () => {
    expect(FIFA_COUNTRY_CODES["SCO"]).toBe("GB-SCT");
    expect(FIFA_COUNTRY_CODES["WAL"]).toBe("GB-WLS");
    expect(FIFA_COUNTRY_CODES["NIR"]).toBe("GB-NIR");
    expect(resolveCountryFlagCode("SCO")).toBe("GB-SCT");
    expect(resolveCountryFlagCode("WAL")).toBe("GB-WLS");
    expect(resolveCountryFlagCode("NIR")).toBe("GB-NIR");
  });

  it("mantém outros códigos padrão inalterados", () => {
    expect(FIFA_COUNTRY_CODES["ESP"]).toBe("ES");
    expect(FIFA_COUNTRY_CODES["BRA"]).toBe("BR");
    expect(FIFA_COUNTRY_CODES["ARG"]).toBe("AR");
    expect(resolveCountryFlagCode("ESP")).toBe("ES");
    expect(resolveCountryFlagCode("BRA")).toBe("BR");
    expect(resolveCountryFlagCode("ARG")).toBe("AR");
  });
});
