export function UseCloseModal(saveClick: number, onClose: () => void) {
  setTimeout(() => {
    window.scrollTo({ top: saveClick, behavior: "instant" });
  }, 0);

  onClose();
}
