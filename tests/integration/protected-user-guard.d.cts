interface Guard {
  assertEnvironment(env: Record<string, string | undefined>, preload: boolean): void;
  assertUid(uid: string): void;
  assertPath(path: string): void;
  assertRequestText(text: string): void;
}
export function createGuard(uid: string): Guard;
export function parseGuard(read: () => string): Guard;
export function loadGuard(): Guard;
export function assertSafeEnvironment(): void;
export function assertSafePath(path: string): void;
