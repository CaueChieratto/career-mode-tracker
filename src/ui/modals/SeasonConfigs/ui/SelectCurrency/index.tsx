import { Dispatch, SetStateAction } from "react";
import { Career } from "../../../../../common/interfaces/Career";
import Styles from "./SelectCurrency.module.css";
import { useSelectCurrency } from "./hooks/useSelectCurrency";
import { CURRENCY_OPTIONS } from "./constants/currencies";
import { SeasonConfigSubScreen } from "../../components/SeasonConfigSubScreen";

type SelectCurrencyProps = {
  careerId: string;
  clubColor?: string;
  career: Career;
  setSelectedCareer: Dispatch<SetStateAction<Career>>;
  onClose: () => void;
};

export const SelectCurrency = ({
  clubColor,
  career,
  setSelectedCareer,
  onClose,
}: SelectCurrencyProps) => {
  const { isSaving, selectedCurrency, setSelectedCurrency, handleConfirm } =
    useSelectCurrency({
      career,
      setSelectedCareer,
      onClose,
    });

  return (
    <SeasonConfigSubScreen
      title="Selecionar Moeda"
      subtitle="Escolha a moeda padrão da sua carreira"
      clubColor={clubColor}
      confirmLabel={isSaving ? "Salvando..." : "Confirmar Moeda"}
      onConfirm={handleConfirm}
      onBack={onClose}
      isSaving={isSaving}
    >
      <div className={Styles.grid_scroll}>
        <div className={Styles.currency_grid}>
          {CURRENCY_OPTIONS.map((currency) => (
            <div
              key={currency.code}
              className={`${Styles.currency_card} ${
                selectedCurrency === currency.code ||
                selectedCurrency === currency.symbol
                  ? Styles.selected
                  : ""
              }`}
              onClick={() => setSelectedCurrency(currency.symbol)}
            >
              <span className={Styles.currency_symbol}>{currency.symbol}</span>
              <span className={Styles.currency_name}>{currency.name}</span>
            </div>
          ))}
        </div>
      </div>
    </SeasonConfigSubScreen>
  );
};
