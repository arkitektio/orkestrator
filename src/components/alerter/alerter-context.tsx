import React, { useContext } from "react";
import { AlertModalState } from "./AlertModal";

export type AlertFunc = (message: AlertModalState) => Promise<boolean>

export type AlertContextType = {
  alert: AlertFunc;
};

export const AlertContext = React.createContext<AlertContextType>({
  alert: null as unknown as AlertFunc,
});

export const useAlert = () => useContext(AlertContext);
