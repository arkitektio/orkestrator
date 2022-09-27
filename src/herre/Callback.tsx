import React, { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { useSearchParams } from "react-router-dom";
import { useHerre } from "./herre-context";

export interface CallbackProps {}

export const Callback: React.FC<CallbackProps> = (props) => {
  const [params, setParams] = useSearchParams();
  const { setCode } = useHerre();

  useEffect(() => {
    let code = params.get("code");
    console.log(code);
    if (code) {
      setCode(code);
    }
  }, []);

  return <>Signing in.....</>;
};
