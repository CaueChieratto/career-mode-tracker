import {
  addConfirmToast,
  addStandardToast,
  cancelConfirm,
  cancelPendingConfirms,
  clearAllToasts,
  dismissToast,
  pauseToastTimer,
  resumeToastTimer,
  settleConfirm,
  toastStore,
} from "./toastStore";
import {
  ConfirmToastItem,
  ConfirmToastOptions,
  StandardToastItem,
  StandardToastType,
  ToastApi,
  ToastItem,
  ToastOptions,
  ToastType,
} from "./types";

export const toast: ToastApi = {
  success: (message: string, options?: ToastOptions) =>
    addStandardToast("success", message, options),
  error: (message: string, options?: ToastOptions) =>
    addStandardToast("error", message, options),
  warning: (message: string, options?: ToastOptions) =>
    addStandardToast("warning", message, options),
  info: (message: string, options?: ToastOptions) =>
    addStandardToast("info", message, options),
  confirm: (message: string, options?: ConfirmToastOptions) =>
    addConfirmToast(message, options),
  dismiss: (id: string) => dismissToast(id),
  clear: () => clearAllToasts(),
  cancelPendingConfirms: () => cancelPendingConfirms(),
};

export const ToastService = toast;

export {
  toastStore,
  pauseToastTimer,
  resumeToastTimer,
  settleConfirm,
  cancelConfirm,
  cancelPendingConfirms,
  dismissToast,
  clearAllToasts,
};

export { markErrorAsNotified, isErrorNotified } from "./notifiedErrorGuard";

export type {
  StandardToastType,
  ToastType,
  ToastOptions,
  ConfirmToastOptions,
  StandardToastItem,
  ConfirmToastItem,
  ToastItem,
  ToastApi,
};

