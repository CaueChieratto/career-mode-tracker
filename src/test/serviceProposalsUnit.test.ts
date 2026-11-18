import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceProposals } from "../common/services/ServiceProposals";
import { auth } from "./mocks/firebaseClient";
import {
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  documentSnapshot,
  querySnapshot,
} from "./mocks/firestore";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";

describe("ServiceProposals (Unit Tests - Padrão FC Barcelona)", () => {
  beforeEach(() => {
    auth.currentUser = { uid: "test-user" };
    setDoc.mockReset().mockResolvedValue(undefined);
    getDoc.mockReset();
    getDocs.mockReset();
    deleteDoc.mockReset().mockResolvedValue(undefined);
    onSnapshot.mockReset();
  });

  const sampleProposal: Omit<TransferProposal, "id"> = {
    careerId: "c_barca",
    seasonId: "s1",
    type: "compra",
    overallStatus: "em_andamento",
    playerId: "player_pedri_8",
    playerName: "Pedri",
    playerNation: "Espanha",
    playerPosition: "MC",
    playerSector: "Meio-Campo",
    playerOverall: 89,
    playerAge: 23,
    timing: "Imediata",
    clubNegotiation: {
      partnerClub: "Las Palmas",
      transferFee: 60000000,
      status: "aceita",
    },
    playerNegotiation: {
      weeklyWage: 200000,
      durationYears: 5,
      squadRole: "Crucial",
      status: "em_negociacao",
    },
  };

  it("lança erro se usuário não estiver autenticado ao criar proposta", async () => {
    auth.currentUser = null;
    await expect(
      ServiceProposals.createProposal("c_barca", "s1", sampleProposal),
    ).rejects.toThrow("Usuário não autenticado");
  });

  it("cria proposta e persiste com setDoc sanitizado e ID gerado", async () => {
    const created = await ServiceProposals.createProposal(
      "c_barca",
      "s1",
      sampleProposal,
    );

    expect(created.id).toBeDefined();
    expect(created.id).toMatch(/^prop_/);
    expect(created.overallStatus).toBe("em_andamento");
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it("atualiza proposta existente e recalcula status geral se etapas mudarem", async () => {
    const existingDocData: TransferProposal = {
      ...sampleProposal,
      id: "prop_123",
      createdAt: 1000,
      updatedAt: 1000,
    };

    getDoc.mockResolvedValueOnce(
      documentSnapshot("prop_123", existingDocData, true),
    );

    await ServiceProposals.updateProposal("c_barca", "s1", "prop_123", {
      playerNegotiation: {
        weeklyWage: 200000,
        durationYears: 5,
        squadRole: "Crucial",
        status: "aceita",
      },
    });

    expect(setDoc).toHaveBeenCalledTimes(1);
    const passedData = setDoc.mock.calls[0][1] as TransferProposal;
    expect(passedData.overallStatus).toBe("aguardando_confirmacao");
    expect(passedData.playerNegotiation?.status).toBe("aceita");
    expect(passedData.updatedAt).toBeGreaterThan(1000);
  });

  it("lança erro ao atualizar proposta que não existe", async () => {
    getDoc.mockResolvedValueOnce(documentSnapshot("prop_missing", null, false));

    await expect(
      ServiceProposals.updateProposal("c_barca", "s1", "prop_missing", {
        timing: "Imediata",
      }),
    ).rejects.toThrow("Proposta não encontrada.");
  });

  it("exclui proposta invocando deleteDoc na referência correta", async () => {
    await ServiceProposals.deleteProposal("c_barca", "s1", "prop_123");
    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });

  it("retorna lista de propostas em getProposalsBySeason", async () => {
    const listData = [
      { id: "prop_1", playerName: "Pedri", overallStatus: "em_andamento" },
      { id: "prop_2", playerName: "Gavi", overallStatus: "aguardando_confirmacao" },
    ];
    getDocs.mockResolvedValueOnce(
      querySnapshot(listData.map((d) => ({ id: d.id, data: d }))),
    );

    const result = await ServiceProposals.getProposalsBySeason("c_barca", "s1");
    expect(result).toHaveLength(2);
    expect(result[0].playerName).toBe("Pedri");
    expect(result[1].playerName).toBe("Gavi");
  });

  it("retorna proposta específica por getProposalById ou null se não encontrada", async () => {
    getDoc.mockResolvedValueOnce(
      documentSnapshot("prop_1", { id: "prop_1", playerName: "Pedri" }, true),
    );

    const found = await ServiceProposals.getProposalById(
      "c_barca",
      "s1",
      "prop_1",
    );
    expect(found).not.toBeNull();
    expect(found?.playerName).toBe("Pedri");

    getDoc.mockResolvedValueOnce(documentSnapshot("prop_404", null, false));
    const notFound = await ServiceProposals.getProposalById(
      "c_barca",
      "s1",
      "prop_404",
    );
    expect(notFound).toBeNull();
  });

  it("gerencia onSnapshot em listenProposals e repassa erros", () => {
    const unsubMock = vi.fn();
    onSnapshot.mockReturnValueOnce(unsubMock);

    const onUpdate = vi.fn();
    const onError = vi.fn();

    const unsub = ServiceProposals.listenProposals(
      "c_barca",
      "s1",
      onUpdate,
      onError,
    );

    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(unsub).toBe(unsubMock);

    // Simula disparo de callback
    const snapshotCb = onSnapshot.mock.calls[0][1] as (snap: unknown) => void;
    snapshotCb(
      querySnapshot([
        {
          id: "prop_1",
          data: { id: "prop_1", playerName: "Lamine Yamal" },
        },
      ]),
    );
    expect(onUpdate).toHaveBeenCalledWith([
      { id: "prop_1", playerName: "Lamine Yamal" },
    ]);

    // Simula erro
    const errorCb = onSnapshot.mock.calls[0][2] as (err: Error) => void;
    const testErr = new Error("Snapshot error");
    errorCb(testErr);
    expect(onError).toHaveBeenCalledWith(testErr);
  });
});

