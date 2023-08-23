import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export interface CallbackProps {}

export const Callback: React.FC<CallbackProps> = (props) => {
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    let code = params.get("code");
    console.log(code);
    if (code) {
      localStorage.setItem("herre-code", code);
      window.close();
    }
  }, []);

  return <>Signing in.....</>;
};
