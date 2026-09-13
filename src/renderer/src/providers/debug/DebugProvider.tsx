import { useMemo, useState } from "react";
import { DebugContext } from "./DebugContext";

export const DebugProvider = (props: { children: React.ReactNode }) => {
  const [debug, setDebug] = useState(false);
  const value = useMemo(() => ({ debug, setDebug }), [debug]);
  return (
    <DebugContext.Provider value={value}>
      {props.children}
    </DebugContext.Provider>
  );
};
