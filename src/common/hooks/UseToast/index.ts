import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  ConfirmToastOptions,
  settleConfirm,
  toast,
  ToastItem,
  ToastOptions,
  toastStore,
} from "../../services/ToastService";

export interface UseToastReturn {
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  confirm: (message: string, options?: ConfirmToastOptions) => Promise<boolean>;
  dismiss: (id: string) => void;
  clear: () => void;
  toasts: ToastItem[];
}

export const useToast = (): UseToastReturn => {
  const toasts = useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
    toastStore.getSnapshot,
  );

  const pendingConfirmIdsRef = useRef<Set<string>>(new Set());

  const confirm = useCallback(
    async (
      message: string,
      options?: ConfirmToastOptions,
    ): Promise<boolean> => {
      const id =
        options?.id ??
        `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      pendingConfirmIdsRef.current.add(id);
      try {
        return await toast.confirm(message, { ...options, id });
      } finally {
        pendingConfirmIdsRef.current.delete(id);
      }
    },
    [],
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) =>
      toast.success(message, options),
    [],
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) => toast.error(message, options),
    [],
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) =>
      toast.warning(message, options),
    [],
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) => toast.info(message, options),
    [],
  );

  const dismiss = useCallback((id: string) => toast.dismiss(id), []);

  const clear = useCallback(() => toast.clear(), []);

  useEffect(() => {
    const pendingIds = pendingConfirmIdsRef.current;
    return () => {
      pendingIds.forEach((id) => {
        settleConfirm(id, false);
      });
      pendingIds.clear();
    };
  }, []);

  return {
    success,
    error,
    warning,
    info,
    confirm,
    dismiss,
    clear,
    toasts,
  };
};

export default useToast;

