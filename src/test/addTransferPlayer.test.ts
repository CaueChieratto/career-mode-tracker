import { describe, expect, it } from "vitest";
import {
  getAddTransferPlayerFields,
  getAddTransferPlayerStep1Fields,
  getAddTransferPlayerStep2Fields,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer/constants/transferFormFields";

describe("getAddTransferPlayerFields", () => {
  it("tem placeholders com o Messi de exemplo e campos estritos de Nome, Nacionalidade, Setor e Posição", () => {
    const sections = getAddTransferPlayerFields("ARG", "Compra", ["Inter Miami"]);
    const playerInfo = sections.find((s) => s.title === "Informações do Jogador");
    expect(playerInfo).toBeDefined();

    const fields = playerInfo!.fields.flat();

    const nameField = fields.find((f) => f.id === "playerName");
    expect(nameField?.placeholder).toBe("Ex: Lionel Messi");

    const nationField = fields.find((f) => f.id === "nation");
    expect(nationField?.placeholder).toBe("Ex: ARG");

    const sectorField = fields.find((f) => f.id === "sector");
    expect(sectorField).toBeDefined();

    const positionField = fields.find((f) => f.id === "position");
    expect(positionField).toBeDefined();

    // Campos secundários foram removidos do fluxo simplificado de propostas
    expect(fields.find((f) => f.id === "overall")).toBeUndefined();
    expect(fields.find((f) => f.id === "potential")).toBeUndefined();
    expect(fields.find((f) => f.id === "birthDate")).toBeUndefined();
    expect(fields.find((f) => f.id === "shirtNumber")).toBeUndefined();
    expect(fields.find((f) => f.id === "height")).toBeUndefined();
    expect(fields.find((f) => f.id === "weight")).toBeUndefined();
  });

  it("seção Status tem 'Já treinou o jogador' e capitão", () => {
    const sections = getAddTransferPlayerFields("ARG", "Compra", [], {}, ["Ex-Messi"]);
    const statusSection = sections.find((s) => s.title === "Status");
    expect(statusSection).toBeDefined();

    const statusFields = statusSection!.fields.flat();
    expect(statusFields.map((f) => f.id)).toContain("isKnownPlayer");
    expect(statusFields.map((f) => f.id)).toContain("isCaptain");
  });

  it("exibe Buscar Jogador apenas quando isKnownPlayer é true", () => {
    const withoutKnown = getAddTransferPlayerFields("ARG", "Compra", [], { isKnownPlayer: false }, ["Messi"]);
    expect(withoutKnown.find((s) => s.title === "Buscar Jogador")).toBeUndefined();

    const withKnown = getAddTransferPlayerFields("ARG", "Compra", [], { isKnownPlayer: true }, ["Messi"]);
    const buscarSection = withKnown.find((s) => s.title === "Buscar Jogador");
    expect(buscarSection).toBeDefined();
    expect(buscarSection!.fields.flat()[0].id).toBe("selectedPastPlayer");
  });

  it("possui campo playerValue (valor de mercado estimado) na 2ª fileira e timing na 3ª fileira de Detalhes Contratuais da Compra", () => {
    const compraSections = getAddTransferPlayerStep1Fields("ARG", "Compra", []);
    const contractDetails = compraSections.find((s) => s.title === "Detalhes Contratuais");
    expect(contractDetails).toBeDefined();
    expect(contractDetails!.fields[0][0].id).toBe("fromClub");
    expect(contractDetails!.fields[1].map((f) => f.id)).toEqual(["playerValue", "buyValue"]);
    expect(contractDetails!.fields[2][0].id).toBe("timing");

    const loanSections = getAddTransferPlayerStep1Fields("ARG", "Empréstimo", []);
    const loanDetails = loanSections.find((s) => s.title === "Detalhes Contratuais");
    expect(loanDetails).toBeDefined();
    expect(loanDetails!.fields[0][0].id).toBe("fromClub");
    expect(loanDetails!.fields[1].map((f) => f.id)).toEqual(["playerValue", "loanDuration"]);
    expect(loanDetails!.fields[2].map((f) => f.id)).toEqual(["salary", "wagePercentage"]);

    const buyOptionSection = loanSections.find((s) => s.title === "Opção de Compra");
    expect(buyOptionSection).toBeDefined();
    expect(buyOptionSection!.fields[0][0].id).toBe("hasBuyOption");
  });

  it("na Etapa 1 não inclui salário nem duração em anos, e Etapa 2 não possui timing nem squadRole na Compra", () => {
    const step1Sections = getAddTransferPlayerStep1Fields("ARG", "Compra", []);
    const step1FieldIds = step1Sections.flatMap((s) => s.fields.flat().map((f) => f.id));
    expect(step1FieldIds).not.toContain("salary");
    expect(step1FieldIds).not.toContain("contractTime");
    expect(step1FieldIds).not.toContain("contractUntil");

    const step2Sections = getAddTransferPlayerStep2Fields("Compra");
    const step2FieldIds = step2Sections.flatMap((s) => s.fields.flat().map((f) => f.id));
    expect(step2FieldIds).toContain("salary");
    expect(step2FieldIds).toContain("contractUntil");
    expect(step2FieldIds).toContain("signingBonus");
    expect(step2FieldIds).toContain("agentFee");
    expect(step2FieldIds).not.toContain("timing");
    expect(step2FieldIds).not.toContain("squadRole");
  });

  it("na Etapa 2 do Empréstimo, inclui porcentagem salarial, salário, duração e opção de compra sem squadRole", () => {
    const step2Loan = getAddTransferPlayerStep2Fields("Empréstimo");
    const step2FieldIds = step2Loan.flatMap((s) => s.fields.flat().map((f) => f.id));
    expect(step2FieldIds).toContain("wagePercentage");
    expect(step2FieldIds).toContain("salary");
    expect(step2FieldIds).toContain("loanDuration");
    expect(step2FieldIds).toContain("buyOption");
    expect(step2FieldIds).toContain("dateArrival");
    expect(step2FieldIds).not.toContain("squadRole");
  });
});
