// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import DeleteConfirmModal from "../ui/modals/DeleteConfirmModal";
import { ServiceCareer } from "../common/services/ServiceCareer";
import { toast } from "../common/services/ToastService";
import { Career } from "../common/interfaces/Career";

vi.mock("../common/services/ServiceCareer", () => ({
  ServiceCareer: {
    deleteCareer: vi.fn(),
  },
}));

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("DeleteConfirmModal - Validação de Toasts Precisos", () => {
  const mockCareer: Career = {
    id: "career_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "https://example.com/barca.png",
    currency: "EUR",
    nation: "ESP",
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    createdAt: new Date("2024-07-01"),
    updatedAt: Date.now(),
    clubData: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("exibe 'Carreira excluída com sucesso!' apenas quando selectedCareer for fornecido", async () => {
    vi.mocked(ServiceCareer.deleteCareer).mockResolvedValueOnce();
    const closeModal = vi.fn();

    render(
      <DeleteConfirmModal
        selectedCareer={mockCareer}
        closeModal={closeModal}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Confirmar" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(ServiceCareer.deleteCareer).toHaveBeenCalledWith("career_barca");
      expect(toast.success).toHaveBeenCalledWith("Carreira excluída com sucesso!");
      expect(closeModal).toHaveBeenCalled();
    });
  });

  it("NÃO exibe 'Carreira excluída com sucesso!' quando onConfirm for fornecido sem selectedCareer", async () => {
    const onConfirm = vi.fn().mockImplementation(async () => {
      toast.success("Transferência revertida com sucesso!");
    });
    const closeModal = vi.fn();

    render(
      <DeleteConfirmModal
        onConfirm={onConfirm}
        closeModal={closeModal}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Confirmar" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
      expect(ServiceCareer.deleteCareer).not.toHaveBeenCalled();
      // Deve ter chamado o toast específico do onConfirm, mas NUNCA 'Carreira excluída com sucesso!'
      expect(toast.success).toHaveBeenCalledWith("Transferência revertida com sucesso!");
      expect(toast.success).not.toHaveBeenCalledWith("Carreira excluída com sucesso!");
      expect(closeModal).toHaveBeenCalled();
    });
  });

  it("permite mensagem de sucesso customizada via prop successMessage", async () => {
    const onConfirm = vi.fn().mockResolvedValueOnce(undefined);
    const closeModal = vi.fn();

    render(
      <DeleteConfirmModal
        onConfirm={onConfirm}
        closeModal={closeModal}
        successMessage="Item apagado com sucesso!"
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Confirmar" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Item apagado com sucesso!");
      expect(toast.success).not.toHaveBeenCalledWith("Carreira excluída com sucesso!");
    });
  });

  it("em caso de erro com onConfirm, NÃO exibe 'Erro ao excluir carreira'", async () => {
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error("Falha de rede"));
    const closeModal = vi.fn();

    render(
      <DeleteConfirmModal
        onConfirm={onConfirm}
        closeModal={closeModal}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Confirmar" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Erro na operação de exclusão. Tente novamente.");
      expect(toast.error).not.toHaveBeenCalledWith("Erro ao excluir carreira. Tente novamente.");
    });
  });
});
