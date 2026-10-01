import { createContext, useContext } from "react";
import { useForm } from "../../../../../../../../common/hooks/UseForm";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { TableRowData } from "../../../../../../../../common/interfaces/Table";
import { OptimisticTableData } from "..";

type UseFormReturn = ReturnType<typeof useForm>;

type AddTeamsToTableContextType = UseFormReturn & {
  career: Career;
  season: ClubData;
  teamId?: string;
  teamToEdit?: TableRowData;
  onClose: (data?: OptimisticTableData) => void;
};

export const AddTeamsToTableContext = createContext<
  AddTeamsToTableContextType | undefined
>(undefined);

export const useAddTeamsToTableContext = () => {
  const context = useContext(AddTeamsToTableContext);
  if (!context) {
    throw new Error(
      "useAddTeamsToTableContext deve ser usado dentro de um AddTeamsToTableProvider",
    );
  }
  return context;
};
