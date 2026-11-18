export type StandardToastType = "success" | "error" | "warning" | "info";
export type ToastType = StandardToastType | "confirm";

export interface ToastOptions {
  id?: string;
  title?: string;
  /** Em ms. Use `null` para manter visível até dispensa manual. */
  duration?: number | null;
  /** Chave opcional de deduplicação; padrão: `${type}:${message}` */
  dedupeKey?: string;
  dismissible?: boolean;
}

export interface ConfirmToastOptions {
  id?: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "warning" | "danger";
  /** Impede empilhar duas confirmações idênticas simultâneas */
  confirmKey?: string;
}

export interface StandardToastItem {
  id: string;
  type: StandardToastType;
  title?: string;
  message: string;
  createdAt: number;
  duration: number | null;
  dismissible: boolean;
  dedupeKey: string;
  pulseCount: number;
}

export interface ConfirmToastItem {
  id: string;
  type: "confirm";
  title?: string;
  message: string;
  createdAt: number;
  confirmLabel: string;
  cancelLabel: string;
  tone: "warning" | "danger";
  confirmKey: string;
  pulseCount: number;
}

export type ToastItem = StandardToastItem | ConfirmToastItem;

export interface ToastApi {
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  confirm: (message: string, options?: ConfirmToastOptions) => Promise<boolean>;
  dismiss: (id: string) => void;
  clear: () => void;
  cancelPendingConfirms: () => void;
}

