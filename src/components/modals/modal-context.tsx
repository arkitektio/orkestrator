import React, { useContext } from "react";

export type ModalContextType = {
  show: boolean;
  close: () => void;
};

export const ModalContext = React.createContext<ModalContextType>({
  show: false,
  close: null as unknown as () => void,
});

export const useModal = () => useContext(ModalContext);
