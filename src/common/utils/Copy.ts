import { toast } from "../services/ToastService";

export const Copy = async (
  text: string,
  successMessage: string = "Copiado com sucesso!",
): Promise<boolean> => {
  const isSecure =
    typeof window !== "undefined" &&
    (window.isSecureContext ?? true);

  if (navigator?.clipboard?.writeText && isSecure) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
      return true;
    } catch (err) {
      console.error("Erro ao copiar: ", err);
      toast.error("Não foi possível copiar para a área de transferência.");
      return false;
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const copied = document.execCommand("copy");
    if (copied) {
      toast.success(successMessage);
      return true;
    }
    toast.error("Não foi possível copiar para a área de transferência.");
    return false;
  } catch (err) {
    console.error("Erro ao copiar usando fallback: ", err);
    toast.error("Não foi possível copiar para a área de transferência.");
    return false;
  } finally {
    textArea.remove();
  }
};
