import { describe, expect, it } from "vitest";
import { getSquadFormFields } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/constants/SquadFormFields";
import {
  filterFormSections,
  SquadFormField,
  SquadFormSection,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/helpers/filterFormFields";

describe("filterFormSections - SquadFormFields", () => {
  const dynamicFields = getSquadFormFields(
    "BRA",
    [],
    [],
  ) as SquadFormSection<SquadFormField>[];

  it("não exibe seção Manutenção na criação, mas exibe na edição", () => {
    const creationSections = filterFormSections(dynamicFields, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });
    expect(creationSections.find((s) => s.title === "Manutenção")).toBeUndefined();

    const editSections = filterFormSections(dynamicFields, {
      isEditing: true,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });
    expect(editSections.find((s) => s.title === "Manutenção")).toBeDefined();
  });

  it("não exibe mais a seção Detalhes Contratuais nem na criação nem na edição", () => {
    const creationSections = filterFormSections(dynamicFields, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });
    expect(creationSections.find((s) => s.title === "Detalhes Contratuais")).toBeUndefined();

    const editSections = filterFormSections(dynamicFields, {
      isEditing: true,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });
    expect(editSections.find((s) => s.title === "Detalhes Contratuais")).toBeUndefined();
  });

  it("exibe Informações do Contrato e Status abaixo de Informações do Jogador", () => {
    const sections = filterFormSections(dynamicFields, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    expect(sections[0].title).toBe("Informações do Jogador");
    expect(sections[1].title).toBe("Informações do Contrato");
    expect(sections[2].title).toBe("Status");

    const contractSection = sections[1];
    expect(contractSection.fields[0][0].id).toBe("playerValue");
    expect(contractSection.fields[0][0].name).toBe("Valor de mercado");
    expect(contractSection.fields[0][1].id).toBe("salary");
    expect(contractSection.fields[0][1].name).toBe("Salário semanal");
    expect(contractSection.fields[1][0].id).toBe("contractUntil");
    expect(contractSection.fields[1][0].name).toBe("Contrato até");
    expect(contractSection.fields[1][0].maxLength).toBe(10);
  });

  it("exibe isKnownPlayer e isCaptain na seção Status", () => {
    const sections = filterFormSections(dynamicFields, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const statusSection = sections.find((s) => s.title === "Status");
    expect(statusSection).toBeDefined();
    const statusFieldIds = statusSection!.fields.flat().map((f) => f.id);
    expect(statusFieldIds).toContain("isKnownPlayer");
    expect(statusFieldIds).toContain("isCaptain");
  });

  it("exibe isKnownPlayer desabilitado se não houver ex-jogadores, e habilitado quando houver", () => {
    const fieldsEmptyPast = getSquadFormFields(
      "BRA",
      [],
      [],
    ) as SquadFormSection<SquadFormField>[];
    const sectionsEmpty = filterFormSections(fieldsEmptyPast, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const isKnownPlayerEmpty = sectionsEmpty
      .find((s) => s.title === "Status")!
      .fields.flat()
      .find((f) => f.id === "isKnownPlayer");
    expect(isKnownPlayerEmpty?.disabled).toBe(true);
    expect(isKnownPlayerEmpty?.note).toBe(
      "Nenhum ex-jogador disponível para recontratação.",
    );

    const fieldsWithPast = getSquadFormFields(
      "BRA",
      ["Ex-Jogador 1"],
      [],
    ) as SquadFormSection<SquadFormField>[];
    const sectionsWithPast = filterFormSections(fieldsWithPast, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const isKnownPlayerActive = sectionsWithPast
      .find((s) => s.title === "Status")!
      .fields.flat()
      .find((f) => f.id === "isKnownPlayer");
    expect(isKnownPlayerActive?.disabled).toBe(false);
    expect(isKnownPlayerActive?.note).toBeUndefined();
  });

  it("só exibe Buscar Jogador quando isKnownPlayer for true e não vinculado inicialmente", () => {
    const fieldsWithPast = getSquadFormFields(
      "BRA",
      ["Ex-Jogador 1"],
      [],
    ) as SquadFormSection<SquadFormField>[];

    // isKnownPlayer = false: Buscar Jogador não aparece
    const sectionsWithoutKnown = filterFormSections(fieldsWithPast, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });
    expect(sectionsWithoutKnown.find((s) => s.title === "Buscar Jogador")).toBeUndefined();

    // isKnownPlayer = true: Buscar Jogador aparece
    const sectionsWithKnown = filterFormSections(fieldsWithPast, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: true,
      hasGroupId: false,
    });
    const buscarSection = sectionsWithKnown.find((s) => s.title === "Buscar Jogador");
    expect(buscarSection).toBeDefined();
    expect(buscarSection!.fields.flat()[0].id).toBe("selectedPastPlayer");

    // Na edição, se já estava vinculado inicialmente, Buscar Jogador não aparece mesmo com isKnownPlayer = true
    const sectionsEditLinked = filterFormSections(fieldsWithPast, {
      isEditing: true,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: true,
      hasGroupId: false,
      hasInitialPlayedWithUs: true,
    });
    expect(sectionsEditLinked.find((s) => s.title === "Buscar Jogador")).toBeUndefined();
  });

  it("altura e peso estão em Informações do Jogador com configuração correta", () => {
    const sections = filterFormSections(dynamicFields, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const playerInfo = sections.find((s) => s.title === "Informações do Jogador");
    expect(playerInfo).toBeDefined();
    const allFields = playerInfo!.fields.flat();

    const heightField = allFields.find((f) => f.id === "height");
    expect(heightField).toBeDefined();
    expect(heightField?.name).toBe("Altura (cm)");
    expect(heightField?.placeholder).toBe("Ex: 169");
    expect(heightField?.maxLength).toBe(3);

    const weightField = allFields.find((f) => f.id === "weight");
    expect(weightField).toBeDefined();
    expect(weightField?.name).toBe("Peso (kg)");
    expect(weightField?.placeholder).toBe("Ex: 67");
    expect(weightField?.maxLength).toBe(3);
  });
});
