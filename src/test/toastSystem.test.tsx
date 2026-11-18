// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEffect, useState } from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import {
  toast,
  toastStore,
  clearAllToasts,
  markErrorAsNotified,
  isErrorNotified,
} from "../common/services/ToastService";
import { ToastProvider } from "../contexts/ToastContext";
import { useToast } from "../common/hooks/UseToast";

describe("Toast Notification System (toastSystem.test.tsx)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllToasts();
  });

  afterEach(() => {
    cleanup();
    clearAllToasts();
    vi.restoreAllMocks();
  });

  it("renders 5 categories in Portal with proper data-testid and roles", () => {
    render(
      <ToastProvider>
        <div>Test App - FC Barcelona</div>
      </ToastProvider>,
    );

    act(() => {
      toast.success("FC Barcelona: Vitória por 4-0 contra Real Madrid!");
      toast.error("Erro ao registrar gol de Robert Lewandowski");
      toast.warning("Lamine Yamal precisa de descanso");
      toast.info("Pedri retornou aos treinamentos em campo");
    });

    expect(screen.getByTestId("toast-success")).toBeDefined();
    expect(screen.getByText(/FC Barcelona: Vitória por 4-0/)).toBeDefined();

    expect(screen.getByTestId("toast-error")).toBeDefined();
    expect(screen.getByText(/Erro ao registrar gol/)).toBeDefined();

    expect(screen.getByTestId("toast-warning")).toBeDefined();
    expect(screen.getByText(/Lamine Yamal precisa de descanso/)).toBeDefined();

    expect(screen.getByTestId("toast-info")).toBeDefined();
    expect(screen.getByText(/Pedri retornou aos treinamentos/)).toBeDefined();
  });

  it("preserves multiple newlines (\\n\\n) properly in messages", () => {
    render(
      <ToastProvider>
        <div>FC Barcelona Camp Nou</div>
      </ToastProvider>,
    );

    const multilineMsg = "Parabéns ao FC Barcelona!\n\nTítulo da Champions League conquistado.";
    act(() => {
      toast.info(multilineMsg);
    });

    const infoToast = screen.getByTestId("toast-info");
    expect(infoToast).toBeDefined();
    expect(infoToast.textContent).toContain("Parabéns ao FC Barcelona!");
    expect(infoToast.textContent).toContain("Título da Champions League conquistado.");
  });

  it("auto-closes standard toasts according to their default durations", () => {
    render(
      <ToastProvider>
        <div>FC Barcelona Timers</div>
      </ToastProvider>,
    );

    act(() => {
      toast.success("Sucesso", { duration: 1000 });
    });

    expect(screen.getByTestId("toast-success")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.queryByTestId("toast-success")).toBeNull();
  });

  it("persists toast indefinitely when duration is null", () => {
    render(
      <ToastProvider>
        <div>FC Barcelona Persistent Toast</div>
      </ToastProvider>,
    );

    act(() => {
      toast.info("Mensagem persistente de La Masia", { duration: null });
    });

    expect(screen.getByTestId("toast-info")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByTestId("toast-info")).toBeDefined();
  });

  it("pauses timer on mouseEnter and resumes on mouseLeave", () => {
    render(
      <ToastProvider>
        <div>FC Barcelona Hover Controls</div>
      </ToastProvider>,
    );

    act(() => {
      toast.warning("Aviso sobre suspensão de Gavi", { duration: 3000 });
    });

    const card = screen.getByTestId("toast-warning");
    expect(card).toBeDefined();

    // Advance halfway
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Hover (mouseEnter) -> pauses
    fireEvent.mouseEnter(card);

    // Advance 5 seconds while hovered
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Still in document because timer paused!
    expect(screen.getByTestId("toast-warning")).toBeDefined();

    // Leave (mouseLeave) -> resumes remaining 1500ms
    fireEvent.mouseLeave(card);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // Still there before remaining time passes
    expect(screen.getByTestId("toast-warning")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(600);
    });
    // Now dismissed!
    expect(screen.queryByTestId("toast-warning")).toBeNull();
  });

  it("deduplicates identical messages within short window", () => {
    render(
      <ToastProvider>
        <div>FC Barcelona Deduplication</div>
      </ToastProvider>,
    );

    act(() => {
      toast.info("Hansi Flick confirmou a escalação");
      toast.info("Hansi Flick confirmou a escalação");
      toast.info("Hansi Flick confirmou a escalação");
    });

    const infoToasts = screen.getAllByTestId("toast-info");
    expect(infoToasts).toHaveLength(1);
  });

  it("enforces max limit of 4 standard toasts without removing confirm toast", async () => {
    render(
      <ToastProvider>
        <div>FC Barcelona Capacity</div>
      </ToastProvider>,
    );

    let confirmPromise: Promise<boolean>;
    act(() => {
      confirmPromise = toast.confirm("Confirmar venda de atleta de La Masia?");
      toast.info("Toast 1");
      toast.info("Toast 2");
      toast.info("Toast 3");
      toast.info("Toast 4");
    });

    // Should have confirm toast and standard toasts within max capacity
    expect(screen.getByTestId("toast-confirm")).toBeDefined();
    const allToasts = toastStore.getSnapshot();
    // Confirm is never dropped for standard toasts
    expect(allToasts.some((t) => t.type === "confirm")).toBe(true);

    act(() => {
      fireEvent.click(screen.getByTestId("toast-confirm-cancel"));
    });
    await expect(confirmPromise!).resolves.toBe(false);
  });

  it("confirm toast: clicking cancel resolves promise with false", async () => {
    let resolvedValue: boolean | null = null;

    const TestComponent = () => {
      const { confirm } = useToast();
      const handleClick = async () => {
        const res = await confirm("Deseja realmente excluir a temporada?");
        resolvedValue = res;
      };
      return <button onClick={handleClick}>Excluir Temporada</button>;
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Excluir Temporada"));

    expect(screen.getByTestId("toast-confirm")).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByTestId("toast-confirm-cancel"));
      await Promise.resolve();
    });

    expect(resolvedValue).toBe(false);
    expect(screen.queryByTestId("toast-confirm")).toBeNull();
  });

  it("confirm toast: clicking confirm resolves promise with true", async () => {
    let resolvedValue: boolean | null = null;

    const TestComponent = () => {
      const { confirm } = useToast();
      const handleClick = async () => {
        const res = await confirm("Deseja promover o jogador de La Masia?", {
          confirmLabel: "Promover",
        });
        resolvedValue = res;
      };
      return <button onClick={handleClick}>Promover Atleta</button>;
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Promover Atleta"));

    expect(screen.getByTestId("toast-confirm")).toBeDefined();
    expect(screen.getByTestId("toast-confirm-accept").textContent).toContain("Promover");

    await act(async () => {
      fireEvent.click(screen.getByTestId("toast-confirm-accept"));
      await Promise.resolve();
    });

    expect(resolvedValue).toBe(true);
    expect(screen.queryByTestId("toast-confirm")).toBeNull();
  });

  it("confirm toast: pressing Escape resolves promise with false", async () => {
    let resolvedValue: boolean | null = null;

    const TestComponent = () => {
      const { confirm } = useToast();
      const handleClick = async () => {
        const res = await confirm("Deseja reiniciar a tática do FC Barcelona?");
        resolvedValue = res;
      };
      return <button onClick={handleClick}>Reset Tática</button>;
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Reset Tática"));

    expect(screen.getByTestId("toast-confirm")).toBeDefined();

    await act(async () => {
      fireEvent.keyDown(window, { key: "Escape" });
      await Promise.resolve();
    });

    expect(resolvedValue).toBe(false);
    expect(screen.queryByTestId("toast-confirm")).toBeNull();
  });

  it("confirm toast: unmounting component auto-cancels pending confirm with false", async () => {
    let resolvedValue: boolean | null = null;

    const ChildComponent = () => {
      const { confirm } = useToast();
      useEffect(() => {
        confirm("Ação pendente do componente filho").then((res) => {
          resolvedValue = res;
        });
      }, [confirm]);
      return <div>Filho Ativo</div>;
    };

    const ParentComponent = () => {
      const [showChild, setShowChild] = useState(true);
      return (
        <ToastProvider>
          {showChild && <ChildComponent />}
          <button onClick={() => setShowChild(false)}>Desmontar Filho</button>
        </ToastProvider>
      );
    };

    render(<ParentComponent />);

    expect(screen.getByTestId("toast-confirm")).toBeDefined();

    // Desmontar o filho
    await act(async () => {
      fireEvent.click(screen.getByText("Desmontar Filho"));
      await Promise.resolve();
    });

    // O confirm deve ser cancelado automaticamente retornando false
    expect(resolvedValue).toBe(false);
    expect(screen.queryByTestId("toast-confirm")).toBeNull();
  });

  it("confirmKey deduplication: double clicks with same confirmKey do not duplicate", () => {
    render(
      <ToastProvider>
        <div>FC Barcelona Double Click</div>
      </ToastProvider>,
    );

    act(() => {
      toast.confirm("Deseja renovar o contrato de Pedri?", { confirmKey: "renew-pedri" });
      toast.confirm("Deseja renovar o contrato de Pedri?", { confirmKey: "renew-pedri" });
    });

    const confirmCards = screen.getAllByTestId("toast-confirm");
    expect(confirmCards).toHaveLength(1);
  });

  it("markErrorAsNotified prevents duplicate toast notifications", () => {
    const error = new Error("Erro de conexão com o banco");
    expect(isErrorNotified(error)).toBe(false);

    markErrorAsNotified(error);
    expect(isErrorNotified(error)).toBe(true);
  });
});
