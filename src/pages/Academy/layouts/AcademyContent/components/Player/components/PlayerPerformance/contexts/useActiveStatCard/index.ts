import { createContext, useContext } from "react";

type ActiveStatCardContextType = {
  activeCardId: string | null;
  toggleActiveCard: (id: string) => void;
};

export const ActiveStatCardContext = createContext<
  ActiveStatCardContextType | undefined
>(undefined);

export const useActiveStatCard = () => {
  const context = useContext(ActiveStatCardContext);
  if (!context) {
    throw new Error(
      "useActiveStatCard deve ser usado dentro de um ActiveStatCardProvider",
    );
  }
  return context;
};
