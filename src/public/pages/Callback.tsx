import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export interface CallbackProps {}

export const Callback: React.FC<CallbackProps> = (props) => {
  const [params, setParams] = useSearchParams();
  const [codeset, setCodeset] = React.useState<boolean | undefined>(undefined);

  useEffect(() => {
    let code = params.get("code");
    if (code) {
      console.log(code);
      if (code) {
        localStorage.setItem("herre-code", code);
        setCodeset(true);
        window.close();
      }
    } else {
      console.log("no code");
      setCodeset(false);
    }
  }, []);

  return (
    <>
      {codeset != undefined ? (
        <div className="text-white text-xl w-full justify-center h-full p-4">
          {codeset == false && "No code was found in url. Login failed."}
          {codeset == true && (
            <>
              <div className="text-3xl">Login Succeeded</div>
              <div className="text-xl">
                You can now close this page :){" "}
                <div className="text-xs">
                  If it doesn't close automatically, Firefox ...
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="animate-pulse text-white">Signing in</div>
      )}
      .
    </>
  );
};
