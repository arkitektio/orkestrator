import { cn } from "@/lib/utils";

/**
 * The one loading indicator of the menu: a slim sweep under the search while
 * any section has yet to answer. Its height is always reserved, so the list
 * does not shift when it comes and goes.
 */
export const SectionsProgress = ({ active }: { active: boolean }) => (
  <div
    role="progressbar"
    aria-busy={active}
    className="mx-1 mt-1 h-0.5 overflow-hidden rounded-full"
  >
    <div
      className={cn(
        "h-full w-1/3 rounded-full bg-primary/70 animate-task-sweep",
        !active && "invisible",
      )}
    />
  </div>
);
