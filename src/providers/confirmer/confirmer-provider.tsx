import React, { useState } from "react";
import {
  ConfirmContext,
  ConfirmModalState,
  ConfirmRequest,
  Defered,
} from "./confirmer-context";

export type IConfirmerProviderProps = { children: React.ReactNode };

const ConfirmerProvider: React.FC<IConfirmerProviderProps> = ({ children }) => {
  const [state, setState] = useState<ConfirmModalState | undefined>(undefined);

  const confirm = (state: ConfirmRequest) => {
    var defered = new Defered();
    console.log("Confirming", state);

    var promise = new Promise<boolean>((resolve, reject) => {
      defered.resolver = resolve;
      defered.rejecter = reject;
    }).then((result) => {
      console.log("Confirming", state);
      setState(undefined);
      return result;
    });
    console.log("Confirming", state);
    setState({ ...state, defered: defered });

    return promise;
  };

  return (
    <>
      <ConfirmContext.Provider
        value={{
          confirm: confirm,
          state: state,
        }}
      >
        {children}
      </ConfirmContext.Provider>
    </>
  );
};

export { ConfirmerProvider };
