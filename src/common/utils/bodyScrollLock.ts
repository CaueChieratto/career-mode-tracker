type ScrollSnapshot = {
  bodyOverflow: string;
  hadModalOpenClass: boolean;
};

let activeLocks = 0;
let snapshot: ScrollSnapshot | null = null;

export const lockBodyScroll = (): (() => void) => {
  if (typeof document === "undefined") return () => {};

  if (activeLocks === 0) {
    snapshot = {
      bodyOverflow: document.body.style.overflow,
      hadModalOpenClass: document.body.classList.contains("modal-open"),
    };
  }

  activeLocks += 1;
  document.body.classList.add("modal-open");
  document.body.style.overflow = "hidden";

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);

    if (activeLocks > 0) {
      document.body.classList.add("modal-open");
      document.body.style.overflow = "hidden";
      return;
    }

    document.body.style.overflow = snapshot?.bodyOverflow ?? "";
    if (!snapshot?.hadModalOpenClass) {
      document.body.classList.remove("modal-open");
    }
    snapshot = null;
  };
};
