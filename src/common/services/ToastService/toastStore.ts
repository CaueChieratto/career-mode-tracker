import {
  ConfirmToastItem,
  ConfirmToastOptions,
  StandardToastItem,
  StandardToastType,
  ToastItem,
  ToastOptions,
} from "./types";

interface TimerEntry {
  timeoutId: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
  paused: boolean;
}

interface ConfirmResolver {
  settled: boolean;
  resolve: (decision: boolean) => void;
}

const MAX_STANDARD_TOASTS = 4;

const BASE_DURATIONS: Record<StandardToastType, number> = {
  success: 3000,
  info: 4500,
  warning: 4500,
  error: 6000,
};

let currentToasts: ToastItem[] = [];
const listeners = new Set<() => void>();
const timerMap = new Map<string, TimerEntry>();
const confirmResolvers = new Map<string, ConfirmResolver>();

let idCounter = 0;
const generateId = (): string => `toast_${Date.now()}_${++idCounter}`;

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export const resolveDefaultDuration = (
  type: StandardToastType,
  message: string,
  options?: ToastOptions,
): number | null => {
  if (options?.duration === null) {
    return null;
  }
  if (typeof options?.duration === "number") {
    return Math.max(0, options.duration);
  }
  const base = BASE_DURATIONS[type];
  return Math.min(10000, Math.max(base, Math.ceil(message.trim().length * 42)));
};

const clearTimer = (id: string) => {
  const entry = timerMap.get(id);
  if (entry?.timeoutId) {
    clearTimeout(entry.timeoutId);
  }
  timerMap.delete(id);
};

const scheduleTimer = (id: string, duration: number | null) => {
  clearTimer(id);
  if (duration === null) return;
  if (duration <= 0) {
    dismissToast(id);
    return;
  }
  const timeoutId = setTimeout(() => {
    dismissToast(id);
  }, duration);

  timerMap.set(id, {
    timeoutId,
    remainingMs: duration,
    startedAt: Date.now(),
    paused: false,
  });
};

export const pauseToastTimer = (id: string): void => {
  const entry = timerMap.get(id);
  if (!entry || entry.paused) return;

  if (entry.timeoutId) {
    clearTimeout(entry.timeoutId);
    entry.timeoutId = null;
  }
  const elapsed = Date.now() - entry.startedAt;
  entry.remainingMs = Math.max(400, entry.remainingMs - elapsed);
  entry.paused = true;
};

export const resumeToastTimer = (id: string): void => {
  const entry = timerMap.get(id);
  if (!entry || !entry.paused) return;

  entry.startedAt = Date.now();
  entry.paused = false;
  entry.timeoutId = setTimeout(() => {
    dismissToast(id);
  }, entry.remainingMs);
};

export const settleConfirm = (id: string, decision: boolean): void => {
  const entry = confirmResolvers.get(id);
  if (!entry || entry.settled) return;

  entry.settled = true;
  confirmResolvers.delete(id);
  currentToasts = currentToasts.filter((t) => t.id !== id);
  notifyListeners();
  entry.resolve(decision);
};

export const cancelConfirm = (id: string): void => {
  settleConfirm(id, false);
};

export const cancelPendingConfirms = (): void => {
  const pendingIds = Array.from(confirmResolvers.keys());
  pendingIds.forEach((id) => {
    settleConfirm(id, false);
  });
};

export const dismissToast = (id: string): void => {
  const item = currentToasts.find((t) => t.id === id);
  if (!item) return;

  if (item.type === "confirm") {
    settleConfirm(id, false);
    return;
  }

  clearTimer(id);
  currentToasts = currentToasts.filter((t) => t.id !== id);
  notifyListeners();
};

export const addStandardToast = (
  type: StandardToastType,
  message: string,
  options?: ToastOptions,
): string => {
  const dedupeKey = options?.dedupeKey ?? `${type}:${message.trim()}`;
  const existingIndex = currentToasts.findIndex(
    (t) => t.type !== "confirm" && (t as StandardToastItem).dedupeKey === dedupeKey,
  );

  const duration = resolveDefaultDuration(type, message, options);

  if (existingIndex !== -1) {
    const existing = currentToasts[existingIndex] as StandardToastItem;
    const updated: StandardToastItem = {
      ...existing,
      duration,
      pulseCount: existing.pulseCount + 1,
      title: options?.title ?? existing.title,
      dismissible: options?.dismissible ?? existing.dismissible,
    };
    currentToasts = [
      ...currentToasts.slice(0, existingIndex),
      updated,
      ...currentToasts.slice(existingIndex + 1),
    ];
    scheduleTimer(existing.id, duration);
    notifyListeners();
    return existing.id;
  }

  const id = options?.id ?? generateId();
  const newItem: StandardToastItem = {
    id,
    type,
    title: options?.title,
    message,
    createdAt: Date.now(),
    duration,
    dismissible: options?.dismissible ?? true,
    dedupeKey,
    pulseCount: 0,
  };

  const standardItems = currentToasts.filter(
    (t): t is StandardToastItem => t.type !== "confirm",
  );
  if (standardItems.length >= MAX_STANDARD_TOASTS) {
    const oldestStandard = standardItems[0];
    clearTimer(oldestStandard.id);
    currentToasts = currentToasts.filter((t) => t.id !== oldestStandard.id);
  }

  currentToasts = [...currentToasts, newItem];
  scheduleTimer(id, duration);
  notifyListeners();
  return id;
};

export const addConfirmToast = (
  message: string,
  options?: ConfirmToastOptions,
): Promise<boolean> => {
  const confirmKey =
    options?.confirmKey ?? `confirm:${options?.title ?? ""}:${message.trim()}`;

  const existingConfirm = currentToasts.find(
    (t): t is ConfirmToastItem =>
      t.type === "confirm" && t.confirmKey === confirmKey,
  );

  if (existingConfirm) {
    currentToasts = currentToasts.map((t) =>
      t.id === existingConfirm.id
        ? { ...t, pulseCount: t.pulseCount + 1 }
        : t,
    );
    notifyListeners();
    return Promise.resolve(false);
  }

  const id = options?.id ?? generateId();
  const newItem: ConfirmToastItem = {
    id,
    type: "confirm",
    title: options?.title,
    message,
    createdAt: Date.now(),
    confirmLabel: options?.confirmLabel ?? "Confirmar",
    cancelLabel: options?.cancelLabel ?? "Cancelar",
    tone: options?.tone ?? "warning",
    confirmKey,
    pulseCount: 0,
  };

  currentToasts = [...currentToasts, newItem];
  notifyListeners();

  return new Promise<boolean>((resolve) => {
    confirmResolvers.set(id, { settled: false, resolve });
  });
};

export const clearAllToasts = (): void => {
  timerMap.forEach((entry) => {
    if (entry.timeoutId) {
      clearTimeout(entry.timeoutId);
    }
  });
  timerMap.clear();

  cancelPendingConfirms();
  currentToasts = [];
  notifyListeners();
};

export const toastStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): ToastItem[] {
    return currentToasts;
  },
  settleConfirm,
  cancelConfirm,
  cancelPendingConfirms,
  pauseToastTimer,
  resumeToastTimer,
  dismissToast,
  clearAllToasts,
};

