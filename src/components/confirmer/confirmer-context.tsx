import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useContext } from "react";
import { ConfirmModalState } from "./ConfirmModal";

export type ConfirmFun = (message: ConfirmModalState) => Promise<boolean>

export type ConfirmContextType = {
  confirm: ConfirmFun;
};

export const ConfirmContext = React.createContext<ConfirmContextType>({
  confirm: null as unknown as ConfirmFun,
});

export const useConfirm = () => useContext(ConfirmContext);
