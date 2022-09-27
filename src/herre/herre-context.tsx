import React, { useContext } from "react";
import { Herre, HerreUser, Token } from "./herre-types";

export type HerreContextType = {
  logout: () => void;
  login: () => void;
  setCode: (code: string) => void;
  token?: Token;
  user?: HerreUser;
};

export const HerreContext = React.createContext<HerreContextType>({
  logout: () => {},
  login: () => {},
  setCode: () => {},
});

export const useHerre = () => useContext(HerreContext);

export const useRole = (role: string): boolean => {
  const { user } = useHerre();
  return user?.roles?.includes(role) || false;
};
