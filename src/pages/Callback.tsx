import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";
import { useHerre } from "../herre";

export interface CallbackProps {}

export const Callback: React.FC<CallbackProps> = (props) => {
  const [params, setParams] = useSearchParams();
  const { setCode } = useHerre();
  const navigate = useNavigate();

  useEffect(() => {
    let code = params.get("code");
    console.log(code);
    if (code) {
      setCode(code);
      navigate("/user");
    }
  }, []);

  return <>Signing in.....</>;
};
