import { describe, expect, it } from "vitest";
import { getSquadFormFields } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/constants/SquadFormFields";
import {
  filterFormSections,
  SquadFormField,
  SquadFormSection,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/helpers/filterFormFields";
import { ModalType } from "../common/types/enums/ModalType";

describe("Botão de retorno de empréstimo manual na tela de edição do jogador", () => {
  const dynamicFields = getSquadFormFields(
    "BRA",
    ["Ex-Jogador 1"],
    ["Flamengo"],
  ) as SquadFormSection<SquadFormField>[];

  it("exibe o botão 'Retornar do empréstimo?' com ModalType.RETURN_LOAN_CONFIRM para jogador emprestado DO clube (isLoaned: true)", () => {
    const sections = filterFormSections(dynamicFields, {
      isEditing: true,
      isLoaned: true,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const contractSection = sections.find(
      (s) => s.title === "Detalhes Contratuais",
    );
    expect(contractSection).toBeDefined();

    const allFields = contractSection!.fields.flat();
    const returnLoanField = allFields.find((f) => f.id === "returnLoan");

    expect(returnLoanField).toBeDefined();
    expect(returnLoanField?.name).toBe("Retornar do empréstimo?");
    expect(returnLoanField?.checkbox).toBe(true);
    expect(returnLoanField?.action).toBe(ModalType.RETURN_LOAN_CONFIRM);

    // Confirma que fica após 'Esse jogador ja jogou conosco antes?'
    const knownPlayerIndex = allFields.findIndex(
      (f) => f.id === "isKnownPlayer",
    );
    const returnLoanIndex = allFields.findIndex((f) => f.id === "returnLoan");
    expect(knownPlayerIndex).toBeGreaterThanOrEqual(0);
    expect(returnLoanIndex).toBeGreaterThan(knownPlayerIndex);
  });

  it("exibe o botão 'Retornar do empréstimo?' com ModalType.RETURN_LOAN_CONFIRM para jogador emprestado AO clube (isIncomingLoanPlayer: true)", () => {
    const sections = filterFormSections(dynamicFields, {
      isEditing: true,
      isLoaned: false,
      isIncomingLoanPlayer: true,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const contractSection = sections.find(
      (s) => s.title === "Detalhes Contratuais",
    );
    expect(contractSection).toBeDefined();

    const allFields = contractSection!.fields.flat();
    const returnLoanField = allFields.find((f) => f.id === "returnLoan");

    expect(returnLoanField).toBeDefined();
    expect(returnLoanField?.name).toBe("Retornar do empréstimo?");
    expect(returnLoanField?.checkbox).toBe(true);
    expect(returnLoanField?.action).toBe(ModalType.RETURN_LOAN_CONFIRM);

    // Confirma que fica após 'Esse jogador ja jogou conosco antes?'
    const knownPlayerIndex = allFields.findIndex(
      (f) => f.id === "isKnownPlayer",
    );
    const returnLoanIndex = allFields.findIndex((f) => f.id === "returnLoan");
    expect(knownPlayerIndex).toBeGreaterThanOrEqual(0);
    expect(returnLoanIndex).toBeGreaterThan(knownPlayerIndex);
  });

  it("NÃO exibe o botão 'Retornar do empréstimo?' para jogador normal do clube (sem empréstimo ativo)", () => {
    const sections = filterFormSections(dynamicFields, {
      isEditing: true,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const contractSection = sections.find(
      (s) => s.title === "Detalhes Contratuais",
    );
    expect(contractSection).toBeDefined();

    const allFields = contractSection!.fields.flat();
    const returnLoanField = allFields.find((f) => f.id === "returnLoan");

    expect(returnLoanField).toBeUndefined();
  });

  it("NÃO exibe o botão 'Retornar do empréstimo?' na tela de adicionar jogador (isEditing: false)", () => {
    const sections = filterFormSections(dynamicFields, {
      isEditing: false,
      isLoaned: false,
      isIncomingLoanPlayer: false,
      isSigning: false,
      isIncomingLoan: false,
      isKnownPlayer: false,
      hasGroupId: false,
    });

    const allFieldIds = sections.flatMap((s) =>
      s.fields.flat().map((f) => f.id),
    );
    expect(allFieldIds).not.toContain("returnLoan");
  });
});
