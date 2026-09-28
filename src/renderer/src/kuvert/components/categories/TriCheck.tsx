import { cn } from "@/core/util/utils";
import { Check, Minus } from "lucide-react";
import { Membership } from "./membership";

/** A checkbox look for all / some / none of the mail being in a category (inside a list item, not a control). */
export const TriCheck = ({ state }: { state: Membership }) => (
  <span
    aria-hidden
    className={cn(
      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input",
      state !== "none" && "border-primary bg-primary text-primary-foreground",
    )}
  >
    {state === "all" && <Check className="size-3.5" />}
    {state === "some" && <Minus className="size-3.5" />}
  </span>
);
