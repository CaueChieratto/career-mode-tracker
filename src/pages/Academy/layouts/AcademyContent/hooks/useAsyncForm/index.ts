import { useState, FormEvent } from "react";
import { toast, isErrorNotified } from "../../../../../../common/services/ToastService";

export const useAsyncForm = <T>(
  onSubmit: (data: T) => Promise<void>,
  parseData: (formData: FormData) => T,
) => {
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const parsed = parseData(new FormData(e.currentTarget));
      await onSubmit(parsed);
    } catch (error) {
      console.error("Erro ao submeter:", error);
      if (!isErrorNotified(error)) {
        toast.error("Falha ao salvar. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, submit };
};
