import React, { useContext } from "react";
import { AlertModalState } from "./AlertModal";

export type AlertFunc = (message: {
  /** The message we should display */
  message: string;
  /** The title of the alert */
  subtitle?: string;
  /** The label of the button to confirm */
  confirmLabel?: string;
}) => Promise<boolean>;

export type AlertContextType = {
  /** The alert function that can be used to display an alert */

  alert: AlertFunc;
};

export const AlertContext = React.createContext<AlertContextType>({
  alert: null as unknown as AlertFunc,
});

/** Returns the alert context with the alert function */
export const useAlert = () => useContext(AlertContext);
