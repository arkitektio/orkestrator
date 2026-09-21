import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ActionSlotModeProvider,
  readActionPolicy,
} from "@/components/ui/page-action";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import React, {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ActionSlotMode, PlanItem, planActions } from "./actionPlan";
import { flattenChildren } from "./flattenChildren";

/** Width to reserve for the burger before it has been drawn and measured. */
const MENU_FALLBACK = 40;

/**
 * Width of an icon-only action: `size-7` on the Button `icon` size. A fixed
 * token rather than a measurement — the alternative is drawing every action a
 * second time to measure it, and an action may carry a query or a dialog.
 */
const ICON_WIDTH = 28;

const sameModes = (a: readonly ActionSlotMode[], b: readonly ActionSlotMode[]) =>
  a.length === b.length && a.every((mode, index) => mode === b[index]);

const keyOf = (item: React.ReactNode, index: number) =>
  isValidElement(item) && item.key != null ? item.key : index;

export type PageActionBarProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Pixels between items; must match the container's `gap`. */
  gap?: number;
  /** Accessible name of the burger. */
  menuLabel?: string;
};

/**
 * A row of page actions that gives way, action by action, when it is narrower
 * than its contents.
 *
 * Each action declares what it gives up and in which order through its policy
 * props (`alwaysShow`, `priority`, `collapse`, see `PageAction`); this row
 * measures, plans (`planActions`) and then tells every action which form it is
 * being drawn in. Plain `<Button>` children are actions too, with the default
 * policy, so a row needs no migration to keep working.
 *
 * Items are never cloned into a hidden measuring copy — an action may carry a
 * query or a dialog, and a ghost would run it twice. Instead every action is
 * measured the first time it is drawn in its row form, its width remembered,
 * and later layouts use the remembered widths. A change in the set of children
 * draws everything in full for one layout pass to re-measure; that pass
 * happens before paint, so nothing flashes.
 */
export const PageActionBar = ({
  children,
  className,
  gap = 4,
  menuLabel = "More actions",
  ...rest
}: PageActionBarProps) => {
  const items = flattenChildren(children).filter(Boolean);
  const count = items.length;
  const policies = items.map(readActionPolicy);
  // Keys, when the children carry them, so a swapped action re-measures too.
  const signature = items.map((item, index) => String(keyOf(item, index))).join("|");

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const widths = useRef<number[]>([]);
  const menuWidth = useRef(0);
  const [modes, setModes] = useState<ActionSlotMode[]>(() => items.map(() => "row"));
  // The policies are derived from `children` on every render, so the planner
  // reads them through a ref rather than closing over the set it was built
  // with — an action whose policy changes (a toggle that becomes pinned) must
  // not be planned by the policy it had last render.
  const policiesRef = useRef(policies);
  policiesRef.current = policies;

  // New children: forget what was measured and draw all of them once.
  useLayoutEffect(() => {
    widths.current = [];
    setModes(Array.from({ length: count }, () => "row"));
  }, [signature, count]);

  const relayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    // Only an action drawn in its row form measures its row width; the others
    // keep the width they were measured at.
    itemRefs.current.forEach((element, index) => {
      if (element && modes[index] === "row") widths.current[index] = element.offsetWidth;
    });
    if (menuRef.current) menuWidth.current = menuRef.current.offsetWidth;
    const known = widths.current.slice(0, count);
    if (known.length < count || known.some((width) => width === undefined)) return;
    const planned = planActions({
      items: known.map((width, index): PlanItem => ({ width, policy: policiesRef.current[index] })),
      available: container.clientWidth,
      gap,
      menuWidth: menuWidth.current || MENU_FALLBACK,
      iconWidth: ICON_WIDTH,
      previous: modes.length === count ? modes : undefined,
    });
    setModes((current) => (sameModes(current, planned) ? current : planned));
  }, [count, gap, modes]);

  // After every render: cheap, and the state write is a no-op when settled.
  useLayoutEffect(relayout);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => relayout());
    observer.observe(container);
    // Visible items can change width (a label that reads "Reporting…").
    itemRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, [relayout]);

  const modeAt = (index: number): ActionSlotMode => modes[index] ?? "row";
  const inMenu = items.filter((_, index) => modeAt(index) === "menu");

  return (
    <div
      ref={containerRef}
      className={cn("flex min-w-0 flex-row items-center overflow-hidden", className)}
      style={{ gap }}
      {...rest}
    >
      {items.map((item, index) => {
        const mode = modeAt(index);
        if (mode === "menu" || mode === "hidden") return null;
        return (
          <div
            key={keyOf(item, index)}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            className="flex shrink-0 items-center"
          >
            <ActionSlotModeProvider mode={mode}>{item}</ActionSlotModeProvider>
          </div>
        );
      })}
      {inMenu.length > 0 && (
        <div ref={menuRef} className="flex shrink-0 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={menuLabel} title={menuLabel}>
                <Menu className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              // A `PageAction` already draws its menu form full-width; the
              // `[&_button]` rules are for everything else that can end up in
              // here — a dropdown trigger, a link, a slot's own control.
              className="flex w-auto min-w-44 flex-col items-stretch gap-1 p-1 [&_a]:w-full [&_button]:w-full [&_button]:justify-start"
            >
              <ActionSlotModeProvider mode="menu">
                {inMenu.map((item, index) => (
                  <React.Fragment key={keyOf(item, count + index)}>{item}</React.Fragment>
                ))}
              </ActionSlotModeProvider>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export default PageActionBar;
