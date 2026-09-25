import { ObjectButton } from "@/providers/smart/ObjectButton";
import { motion } from "framer-motion";
import { useEffect } from "react";

import { useSelection } from "../SelectionContext";

export const SelectionBox = () => {
  const { selection, setSelection, bselection, setBSelection } = useSelection();

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) {
        return;
      }

      let el: HTMLElement | null = target;
      let keepSelection = false;

      while (el && el !== document.body) {
        if (el.hasAttribute("data-object") || el.hasAttribute("data-nonbreaker")) {
          keepSelection = true;
          break;
        }
        el = el.parentElement;
      }

      if (!keepSelection) {
        e.stopPropagation();
        setSelection([]);
        setBSelection([]);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSelection([]);
        setBSelection([]);
      }
    };

    document.body.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [setSelection, setBSelection]);

  if (selection.length === 0) {
    return null;
  }

  const uniqueIdentifiers = Array.from(new Set(selection.map((s) => s.identifier)));
  const buniqueIdentifiers = Array.from(
    new Set(bselection.map((s) => s.identifier)),
  );
  const btotal = bselection.length;
  const total = selection.length;
  const types = uniqueIdentifiers.length;

  return (
    <motion.div
      className="fixed bottom-3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      role="status"
      aria-live="polite"
      data-nonbreaker
    >
      <div className="shadow-3xl shadow-black/10 flex items-center gap-3 bg-background border border-border rounded-full px-4 py-2 shadow-2xl will-change-transform transition-transform transition-opacity duration-200 ease-out transform">
        <div className="flex items-baseline gap-2">
          <div className="font-semibold text-primary">{total}</div>
          <div className="ml-2 text-sm text-muted-foreground">
            {uniqueIdentifiers.map((c) => c).join(", ")}
          </div>
          <div className="text-sm text-muted-foreground">selected</div>
        </div>

        {btotal > 0 && (
          <div className="flex items-baseline gap-2">
            <div className="font-semibold text-red-500"> + {btotal}</div>
            <div className="ml-2 text-sm text-muted-foreground">
              {buniqueIdentifiers.map((c) => c).join(", ")}
            </div>
            <div className="text-sm text-muted-foreground">selected</div>
          </div>
        )}

        <div className="w-px h-6 bg-border opacity-30" />

        {types === 1 && <ObjectButton objects={selection} partners={bselection} />}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelection([]);
            setBSelection([]);
          }}
          aria-label="Clear selection"
          className="ml-3 mr-2 p-1 rounded-full hover:bg-muted focus:outline-none"
        >
          <span className="text-xl leading-none">x</span>
        </button>
      </div>
    </motion.div>
  );
};