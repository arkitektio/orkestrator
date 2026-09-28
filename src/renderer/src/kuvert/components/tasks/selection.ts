import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * The task the reading pane shows: `?task=<id>` on the current page, so a
 * selection survives reloads, back/forward and links. Other params are kept.
 */
export const useTaskSelection = () => {
  const [params, setParams] = useSearchParams();
  const selected = params.get("task");

  const select = useCallback(
    (next: string | null, replace = true) =>
      setParams(
        (current) => {
          const out = new URLSearchParams(current);
          out.delete("task");
          if (next) out.set("task", next);
          return out;
        },
        { replace },
      ),
    [setParams],
  );

  return { selected, select };
};
