import { describe, expect, it } from "vitest";
import { buildLoanSections } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/constants/buildLoadFormSections";
import { validateLoan } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/validators/loanValidator";
import { Players } from "../common/interfaces/playersInfo/players";

describe("loanExitNoDateInput - Remoção de Data em Empréstimos de Saída (Padrão FC Barcelona)", () => {
  const mockPlayer: Players = {
    id: "p_ansumane_fati",
    name: "Ansu Fati",
    position: "PE",
    sector: "Ataque",
    age: 23,
    overall: 79,
    nation: "ESP",
    shirtNumber: "10",
    buy: false,
    sell: false,
    captain: false,
    loan: false,
    contract: [],
    ballonDor: 0,
    statsLeagues: [],
  };

  it("não inclui o campo dateExit (Data do empréstimo) em novo empréstimo de saída", () => {
    const sections = buildLoanSections(
      {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
        firstRefusal: false,
        hasBuyOption: false,
      },
      mockPlayer,
      ["Brighton"],
    );

    const allFields = sections.flatMap((s) => s.fields.flat());
    const dateField = allFields.find((f) => f.id === "dateExit");
    expect(dateField).toBeUndefined();
  });

  it("inclui o campo dateExit com nome 'Data de retorno' quando isReturnLoan for true", () => {
    const returningPlayer: Players = {
      ...mockPlayer,
      loan: true,
    };

    const sections = buildLoanSections(
      {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: true,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
        firstRefusal: false,
        hasBuyOption: false,
      },
      returningPlayer,
      ["Brighton"],
    );

    const allFields = sections.flatMap((s) => s.fields.flat());
    const dateField = allFields.find((f) => f.id === "dateExit");
    expect(dateField).toBeDefined();
    expect(dateField?.name).toBe("Data de retorno");
  });

  it("valida com sucesso um novo empréstimo de saída sem informar dateExit", () => {
    const result = validateLoan(
      {
        toClub: "Brighton",
        loanDuration: "1",
        wagePercentage: "60",
      },
      {
        isReturnLoan: false,
      },
    );

    expect(result.isValid).toBe(true);
    expect(result.data?.toClub).toBe("Brighton");
    expect(result.data?.loanDuration).toBe("1");
    expect(result.data?.wagePercentage).toBe("60");
  });

  it("rejeita encerramento de empréstimo (isReturnLoan: true) sem data de retorno", () => {
    const result = validateLoan(
      {
        toClub: "Brighton",
        dateExit: "",
      },
      {
        isReturnLoan: true,
      },
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Por favor, preencha a data de retorno.");
  });
});
