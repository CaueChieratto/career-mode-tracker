import { useContext } from "react";
import { AcademyContext } from "../..";

export const useAcademyContext = () => {
  const ctx = useContext(AcademyContext);
  if (!ctx || Object.keys(ctx).length === 0) {
    throw new Error(
      "useAcademyContext deve ser utilizado dentro de um AcademyProvider",
    );
  }
  return ctx;
};
