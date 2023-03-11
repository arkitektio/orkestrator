import React, { useState, useEffect } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { useLocation, useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";
import { useHerre } from "@jhnnsrs/herre";

export interface CallbackProps {}

export const Callback: React.FC<CallbackProps> = (props) => {
  const [params, setParams] = useSearchParams();
  const { setCode } = useHerre();
  const navigate = useNavigate();

  useEffect(() => {
    let code = params.get("code");
    if (code) {
      if (window.__TAURI__) {
        emit("code", { code: code });
      } else {
        setCode(code);
        window.close();
      }
    }
  }, []);

  return <>Signing in.....</>;
};
