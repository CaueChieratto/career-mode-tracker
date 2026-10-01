import { createContext, useContext } from "react";
import { useForm } from "../../../../../../../../common/hooks/UseForm";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { OptimisticMatchData } from "..";

type UseFormReturn = ReturnType<typeof useForm>;

type AddMatchesContextType = UseFormReturn & {
  career: Career;
  season: ClubData;
  matchesId?: string;
  onClose: (data?: OptimisticMatchData) => void;
};

export const AddMatchesContext = createContext<
  AddMatchesContextType | undefined
>(undefined);

export const useAddMatchesContext = () => {
  const context = useContext(AddMatchesContext);
  if (!context) {
    throw new Error(
      "useAddMatchesContext deve ser usado dentro de um AddMatchesProvider",
    );
  }
  return context;
};
