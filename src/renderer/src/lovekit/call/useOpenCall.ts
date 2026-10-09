import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useTabActions } from "@/core/tabs/TabsProvider";
import { callLink } from "./links";

export type OpenCallTarget = "here" | "side";

/**
 * Open a call's page: in this tab, or in a split with it (`side`) so the
 * call sits with what you are working on. The split is stacked, the call
 * below: tiles are wide and a page keeps its width. With `join`, connecting
 * on arrival. One implementation behind every Join / Open button.
 */
export const useOpenCall = () => {
  const navigate = useNavigate();
  const { openBeside } = useTabActions();
  return useCallback(
    (call: { id: string; title: string }, options: { join?: boolean; target?: OpenCallTarget } = {}) => {
      const to = callLink(call.id, { join: options.join });
      if (options.target === "side") openBeside(to, { label: call.title, evict: true, axis: "column" });
      else navigate(to);
    },
    [navigate, openBeside],
  );
};
