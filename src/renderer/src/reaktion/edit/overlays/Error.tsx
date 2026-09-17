import { ErrorBox } from "@/reaktion/edit/components/boxes/ErrorBox";
import { SolvedErrorBox } from "@/reaktion/edit/components/boxes/SolvedErrorBox";
import { useEditFlowStore } from "@/reaktion/edit/context";
import { ValidationError } from "@/reaktion/validation/types";
import { AnimatePresence } from "framer-motion";
import { useCallback } from "react";

export const ErrorOverlay = () => {
  const remainingErrors = useEditFlowStore((s) => s.remainingErrors);
  const solvedErrors = useEditFlowStore((s) => s.solvedErrors);
  const instance = useEditFlowStore((s) => s.reactFlowInstance);

  const focus = useCallback(
    (error: ValidationError) => {
      if (error.type !== "node" || !error.id) return;
      void instance?.fitView({ nodes: [{ id: error.id }], duration: 300, maxZoom: 1.5 });
    },
    [instance],
  );

  return (
    <AnimatePresence>
      <div className="absolute top-0 right-0 mr-3 mt-5 z-50 max-w-xs gap-1 flex flex-col min-w-[300px]">
        {remainingErrors.length !== 0 && <ErrorBox errors={remainingErrors} onClick={focus} />}
        {solvedErrors.length !== 0 && <SolvedErrorBox errors={solvedErrors} />}
      </div>
    </AnimatePresence>
  );
};
