import { Dispatch, SetStateAction, useState } from "react";
import { Career } from "../../../../../../common/interfaces/Career";
import { ServiceSeasons } from "../../../../../../common/services/ServiceSeasons";
import { toast } from "../../../../../../common/services/ToastService";
import { getCurrencySymbol } from "../../../../../../common/utils/FormatValue";

type UseSelectCurrencyParams = {
  career: Career;
  setSelectedCareer: Dispatch<SetStateAction<Career>>;
  onClose: () => void;
};

type UseSelectCurrencyReturn = {
  isSaving: boolean;
  selectedCurrency: string;
  setSelectedCurrency: Dispatch<SetStateAction<string>>;
  handleConfirm: () => Promise<void>;
};

export const useSelectCurrency = ({
  career,
  setSelectedCareer,
  onClose,
}: UseSelectCurrencyParams): UseSelectCurrencyReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    getCurrencySymbol(career.currency || "€"),
  );

  const handleConfirm = async (): Promise<void> => {
    try {
      setIsSaving(true);
      const symbol = getCurrencySymbol(selectedCurrency);
      await ServiceSeasons.updateCurrency(career.id, symbol);
      toast.success("Moeda atualizada com sucesso!");
      setSelectedCareer({ ...career, currency: symbol });
      onClose();
    } catch (error) {
      console.error("Erro ao salvar moeda:", error);
      toast.error("Ocorreu um erro ao salvar a moeda selecionada.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    selectedCurrency,
    setSelectedCurrency,
    handleConfirm,
  };
};
