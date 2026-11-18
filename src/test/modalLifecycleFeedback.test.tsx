// @vitest-environment jsdom
import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import DeleteConfirmModal from "../ui/modals/DeleteConfirmModal";
import ReturnLoanConfirmModal from "../ui/modals/ReturnLoanConfirmModal";
import { ServiceCareer } from "../common/services/ServiceCareer";
import { toastStore, clearAllToasts } from "../common/services/ToastService";
import { career } from "./factories/domain";

vi.mock("../common/services/ServiceCareer", () => ({
  ServiceCareer: {
    deleteCareer: vi.fn(),
  },
}));

describe("Modal Lifecycle & Feedback — DeleteConfirmModal & ReturnLoanConfirmModal", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    clearAllToasts();
  });

  afterEach(() => {
    cleanup();
  });

  describe("DeleteConfirmModal", () => {
    const barcelonaCareer = career({
      id: "fc-barcelona-career",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
    });

    it("em caso de sucesso: exibe toast.success e fecha o modal via closeModal()", async () => {
      vi.mocked(ServiceCareer.deleteCareer).mockResolvedValueOnce(undefined);
      const closeModal = vi.fn();

      render(
        <DeleteConfirmModal
          selectedCareer={barcelonaCareer}
          closeModal={closeModal}
        />,
      );

      const confirmButton = screen.getByRole("button", { name: /confirmar/i });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      expect(ServiceCareer.deleteCareer).toHaveBeenCalledWith("fc-barcelona-career");
      expect(closeModal).toHaveBeenCalledTimes(1);

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "success" &&
            t.message.includes("Carreira excluída com sucesso!"),
        ),
      ).toBe(true);
    });

    it("em caso de falha: NÃO fecha o modal e exibe toast.error orientando o usuário", async () => {
      vi.mocked(ServiceCareer.deleteCareer).mockRejectedValueOnce(
        new Error("Network timeout"),
      );
      const closeModal = vi.fn();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <DeleteConfirmModal
          selectedCareer={barcelonaCareer}
          closeModal={closeModal}
        />,
      );

      const confirmButton = screen.getByRole("button", { name: /confirmar/i });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      expect(ServiceCareer.deleteCareer).toHaveBeenCalledWith("fc-barcelona-career");
      expect(closeModal).not.toHaveBeenCalled();

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "error" &&
            t.message.includes("Erro ao excluir carreira. Tente novamente."),
        ),
      ).toBe(true);

      consoleError.mockRestore();
    });
  });

  describe("ReturnLoanConfirmModal", () => {
    it("em caso de sucesso: exibe toast.success e fecha o modal", async () => {
      const onConfirm = vi.fn().mockResolvedValueOnce(undefined);
      const closeModal = vi.fn();

      render(
        <ReturnLoanConfirmModal
          closeModal={closeModal}
          onConfirm={onConfirm}
        />,
      );

      const input = screen.getByPlaceholderText(/11\/07/i);
      fireEvent.change(input, { target: { value: "15/06" } });

      const submitButton = screen.getByRole("button", { name: /confirmar/i });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(onConfirm).toHaveBeenCalledWith("15/06");
      expect(closeModal).toHaveBeenCalledTimes(1);

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "success" &&
            t.message.includes("Jogador retornado do empréstimo com sucesso!"),
        ),
      ).toBe(true);
    });

    it("em caso de erro na confirmação: NÃO fecha o modal e exibe toast.error", async () => {
      const onConfirm = vi.fn().mockRejectedValueOnce(new Error("Firebase save failed"));
      const closeModal = vi.fn();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <ReturnLoanConfirmModal
          closeModal={closeModal}
          onConfirm={onConfirm}
        />,
      );

      const input = screen.getByPlaceholderText(/11\/07/i);
      fireEvent.change(input, { target: { value: "15/06" } });

      const submitButton = screen.getByRole("button", { name: /confirmar/i });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(onConfirm).toHaveBeenCalledWith("15/06");
      expect(closeModal).not.toHaveBeenCalled();

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "error" &&
            t.message.includes("Erro ao retornar o jogador do empréstimo."),
        ),
      ).toBe(true);

      consoleError.mockRestore();
    });

    it("desabilita botão Confirmar durante o processamento assíncrono", async () => {
      let resolvePromise!: () => void;
      const slowConfirm = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          }),
      );
      const closeModal = vi.fn();

      render(
        <ReturnLoanConfirmModal
          closeModal={closeModal}
          onConfirm={slowConfirm}
        />,
      );

      const input = screen.getByPlaceholderText(/11\/07/i);
      fireEvent.change(input, { target: { value: "20/07" } });

      const submitButton = screen.getByRole("button", { name: /confirmar/i });
      act(() => {
        fireEvent.click(submitButton);
      });

      expect((submitButton as HTMLButtonElement).disabled).toBe(true);
      expect(submitButton.textContent).toContain("Confirmando...");

      await act(async () => {
        resolvePromise();
      });

      expect(closeModal).toHaveBeenCalledTimes(1);
    });
  });
});
