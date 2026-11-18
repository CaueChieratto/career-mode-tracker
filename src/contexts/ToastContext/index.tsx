import React, { createContext, useContext, ReactNode } from "react";
import { useToast, UseToastReturn } from "../../common/hooks/UseToast";
import { ToastViewport } from "../../components/Toast";

const ToastContext = createContext<UseToastReturn | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const toastApi = useToast();

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToastContext = (): UseToastReturn => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext deve ser usado dentro de um ToastProvider");
  }
  return context;
};

export default ToastProvider;

