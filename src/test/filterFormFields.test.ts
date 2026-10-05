import { describe, expect, it } from "vitest";
import { getSquadFormFields } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/constants/SquadFormFields";
import {
  filterFormSections,
  SquadFormField,
  SquadFormSection,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/helpers/filterFormFields";

describe("filterFormSections - incomingLoan retorno", () => {
  const dynamicFields = getSquadFormFields(
    "BRA",
    [],
    [],
  ) as SquadFormSection<SquadFormField>[];

  it("não exibe isReturnIncomingLoan nem returnDate para jogador normal na edição", () => {
    const sections = filterFormSections(dynamicFields, {
      isEditing: true,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isReturningIncomingLoan: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const contractSection = sections.find(
      (s) => s.title === "Detalhes Contratuais",
    );
    expect(contractSection).toBeDefined();
    const allFieldIds = contractSection!.fields.flat().map((f) => f.id);
    expect(allFieldIds).not.toContain("isReturnIncomingLoan");
    expect(allFieldIds).not.toContain("returnDate");
    expect(allFieldIds).toContain("salary");
    expect(allFieldIds).toContain("contractTime");
  });

  it("não exibe campos de transferência nem de retorno de empréstimo para jogador incomingLoan na edição", () => {
    const sections = filterFormSections(dynamicFields, {
      isEditing: true,
      isLoaned: false,
      isIncomingLoanPlayer: true,
      isSigning: false,
      isIncomingLoan: true,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const contractSection = sections.find(
      (s) => s.title === "Detalhes Contratuais",
    );
    expect(contractSection).toBeDefined();
    const allFieldIds = contractSection!.fields.flat().map((f) => f.id);
    expect(allFieldIds).not.toContain("isReturnIncomingLoan");
    expect(allFieldIds).not.toContain("returnDate");
    expect(allFieldIds).not.toContain("fromClub");
    expect(allFieldIds).not.toContain("buyValue");
    expect(allFieldIds).not.toContain("loanDuration");
    expect(allFieldIds).not.toContain("wagePercentage");
    expect(allFieldIds).not.toContain("dateArrival");
    expect(allFieldIds).toEqual([
      "playerValue",
      "salary",
      "contractTime",
      "isKnownPlayer",
    ]);
  });

  it("na edição, com jogador já vinculado (hasInitialPlayedWithUs: true), não exibe o searchable-select mesmo com isKnownPlayer = true", () => {
    const fieldsWithPast = getSquadFormFields(
      "BRA",
      ["Emprestimo"],
      [],
    ) as SquadFormSection<SquadFormField>[];

    const sections = filterFormSections(fieldsWithPast, {
      isEditing: true,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: true,
      hasGroupId: false,
      hasInitialPlayedWithUs: true,
    });

    const contractSection = sections.find(
      (s) => s.title === "Detalhes Contratuais",
    );
    expect(contractSection).toBeDefined();
    const allFieldIds = contractSection!.fields.flat().map((f) => f.id);
    expect(allFieldIds).not.toContain("selectedPastPlayer");
    expect(allFieldIds).toContain("isKnownPlayer");
  });

  it("não exibe isKnownPlayer se não for compra nem empréstimo", () => {
    const fieldsWithPast = getSquadFormFields(
      "BRA",
      ["Emprestimo"],
      [],
    ) as SquadFormSection<SquadFormField>[];
    const sectionsWithoutBuyOrLoan = filterFormSections(fieldsWithPast, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isReturningIncomingLoan: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const allFieldIds = sectionsWithoutBuyOrLoan.flatMap((s) =>
      s.fields.flat().map((f) => f.id),
    );
    expect(allFieldIds).not.toContain("isKnownPlayer");
  });

  it("exibe isKnownPlayer ao adicionar jogador com compra ou empréstimo, desabilitado se não houver ex-jogadores", () => {
    const fieldsEmptyPast = getSquadFormFields(
      "BRA",
      [],
      [],
    ) as SquadFormSection<SquadFormField>[];
    const sectionsEmpty = filterFormSections(fieldsEmptyPast, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isReturningIncomingLoan: false,
      isSigning: true,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const statusSection = sectionsEmpty.find((s) => s.title === "Status");
    expect(statusSection).toBeDefined();
    const isKnownPlayerField = statusSection!.fields
      .flat()
      .find((f) => f.id === "isKnownPlayer");
    expect(isKnownPlayerField).toBeDefined();
    expect(isKnownPlayerField?.disabled).toBe(true);
    expect(isKnownPlayerField?.note).toBe(
      "Nenhum ex-jogador disponível para recontratação.",
    );

    const fieldsWithPast = getSquadFormFields(
      "BRA",
      ["Emprestimo"],
      [],
    ) as SquadFormSection<SquadFormField>[];
    const sectionsWithPast = filterFormSections(fieldsWithPast, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isReturningIncomingLoan: false,
      isSigning: true,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const isKnownPlayerFieldActive = sectionsWithPast
      .find((s) => s.title === "Status")!
      .fields.flat()
      .find((f) => f.id === "isKnownPlayer");
    expect(isKnownPlayerFieldActive).toBeDefined();
    expect(isKnownPlayerFieldActive?.disabled).toBe(false);
    expect(isKnownPlayerFieldActive?.note).toBeUndefined();
  });

  it("na edição, exibe 'Esse jogador ja jogou conosco antes?' em Detalhes Contratuais e exibe searchable-select se marcado", () => {
    const fieldsWithPast = getSquadFormFields(
      "BRA",
      ["Emprestimo"],
      [],
    ) as SquadFormSection<SquadFormField>[];

    // Com isKnownPlayer = false: checkbox aparece em Detalhes Contratuais, mas não o searchable-select
    const sectionsEditUnchecked = filterFormSections(fieldsWithPast, {
      isEditing: true,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isReturningIncomingLoan: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const statusSection = sectionsEditUnchecked.find((s) => s.title === "Status");
    const statusFieldIds = statusSection!.fields.flat().map((f) => f.id);
    expect(statusFieldIds).not.toContain("isSigning");
    expect(statusFieldIds).not.toContain("isLoan");
    expect(statusFieldIds).not.toContain("isKnownPlayer");

    const buscarJogadorSection = sectionsEditUnchecked.find(
      (s) => s.title === "Buscar Jogador",
    );
    expect(buscarJogadorSection).toBeUndefined();

    const contractSection = sectionsEditUnchecked.find(
      (s) => s.title === "Detalhes Contratuais",
    );
    expect(contractSection).toBeDefined();
    const contractFields = contractSection!.fields.flat();
    const knownPlayerField = contractFields.find((f) => f.id === "isKnownPlayer");
    expect(knownPlayerField).toBeDefined();
    expect(knownPlayerField?.name).toBe("Esse jogador ja jogou conosco antes?");
    expect(knownPlayerField?.disabled).toBe(false);

    // Sem marcar isKnownPlayer, selectedPastPlayer não deve aparecer
    expect(contractFields.map((f) => f.id)).not.toContain("selectedPastPlayer");

    // Com isKnownPlayer = true: searchable-select aparece em Detalhes Contratuais
    const sectionsEditChecked = filterFormSections(fieldsWithPast, {
      isEditing: true,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isReturningIncomingLoan: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: true,
      hasGroupId: false,
    });

    const contractSectionChecked = sectionsEditChecked.find(
      (s) => s.title === "Detalhes Contratuais",
    );
    const contractFieldsChecked = contractSectionChecked!.fields.flat();
    const selectedPastPlayerField = contractFieldsChecked.find(
      (f) => f.id === "selectedPastPlayer",
    );
    expect(selectedPastPlayerField).toBeDefined();
    expect(selectedPastPlayerField?.options).toEqual(["Emprestimo"]);
  });
});
