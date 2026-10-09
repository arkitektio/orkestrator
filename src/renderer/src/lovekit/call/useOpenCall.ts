import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useTabActions } from "@/core/tabs/TabsProvider";
import { callLink } from "./links";

export type OpenCallTarget = "here" | "side";

/**
 * Open a call's page: in this tab, or "to the side" (`side`): to the right
 * of it, in a split, so the call sits with what you are working on. With
 * `join`, connecting on arrival. One implementation behind every Join / Open
 * button; the local actions do the same through the action's own `tabs`.
 */
export const useOpenCall = () => {
  const navigate = useNavigate();
  const { openBeside } = useTabActions();
  return useCallback(
    (call: { id: string; title: string }, options: { join?: boolean; target?: OpenCallTarget } = {}) => {
      const to = callLink(call.id, { join: options.join });
      if (options.target === "side") openBeside(to, { label: call.title, evict: true });
      else navigate(to);
    },
    [navigate, openBeside],
  );
};
