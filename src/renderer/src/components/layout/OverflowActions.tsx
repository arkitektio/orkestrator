import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { flattenChildren } from "./flattenChildren";

/** Width to reserve for the burger before it has been drawn and measured. */
const MENU_FALLBACK = 40;

/**
 * How many leading items fit in `available`, in order, keeping room for the
 * burger whenever anything has to be hidden. Everything fits when the sum
 * does; otherwise the burger is charged first and items are taken from the
 * left until the next one would spill.
 */
export const fitCount = (
  widths: readonly number[],
  available: number,
  gap: number,
  menuWidth: number,
): number => {
  const total = widths.reduce((sum, width, index) => sum + width + (index > 0 ? gap : 0), 0);
  if (total <= available) return widths.length;
  let used = menuWidth;
  let count = 0;
  for (const width of widths) {
    const next = used + gap + width;
    if (next > available) break;
    used = next;
    count += 1;
  }
  return count;
};

export type OverflowActionsProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Pixels between items; must match the container's `gap`. */
  gap?: number;
  /** Accessible name of the burger. */
  menuLabel?: string;
};

/**
 * A row of actions that collapses from the right into a burger menu when the
 * row is narrower than its contents.
 *
 * Items are never cloned into a hidden measuring copy — an action may carry a
 * query or a dialog, and a ghost would run it twice. Instead every item is
 * measured the first time it is drawn, its width remembered, and later layouts
 * (a resize, the burger appearing) use the remembered widths. A change in the
 * set of children shows everything again for one layout pass to re-measure;
 * that pass happens before paint, so nothing flashes.
 *
 * Hidden items render inside the popover as they are, stacked, so a button
 * behaves the same in the menu as in the row.
 */
export const OverflowActions = ({
  children,
  className,
  gap = 4,
  menuLabel = "More actions",
  ...rest
}: OverflowActionsProps) => {
  const items = flattenChildren(children).filter(Boolean);
  const count = items.length;
  // Keys, when the children carry them, so a swapped action re-measures too.
  const signature = items
    .map((item, index) => (isValidElement(item) && item.key != null ? String(item.key) : String(index)))
    .join("|");

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const widths = useRef<number[]>([]);
  const menuWidth = useRef(0);
  const [visible, setVisible] = useState(count);

  // New children: forget what was measured and show all of them once.
  useLayoutEffect(() => {
    widths.current = [];
    setVisible(count);
  }, [signature, count]);

  const relayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    itemRefs.current.forEach((element, index) => {
      if (element) widths.current[index] = element.offsetWidth;
    });
    if (menuRef.current) menuWidth.current = menuRef.current.offsetWidth;
    const known = widths.current.slice(0, count);
    if (known.length < count || known.some((width) => width === undefined)) return;
    const next = fitCount(known, container.clientWidth, gap, menuWidth.current || MENU_FALLBACK);
    setVisible((current) => (current === next ? current : next));
  }, [count, gap]);

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
  }, [relayout, visible]);

  const shown = items.slice(0, visible);
  const hidden = items.slice(visible);

  return (
    <div
      ref={containerRef}
      className={cn("flex min-w-0 flex-row items-center overflow-hidden", className)}
      style={{ gap }}
      {...rest}
    >
      {shown.map((item, index) => (
        <div
          key={isValidElement(item) && item.key != null ? item.key : index}
          ref={(element) => {
            itemRefs.current[index] = element;
          }}
          className="flex shrink-0 items-center"
        >
          {item}
        </div>
      ))}
      {hidden.length > 0 && (
        <div ref={menuRef} className="flex shrink-0 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={menuLabel} title={menuLabel}>
                <Menu className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="flex w-auto min-w-44 flex-col items-stretch gap-1 p-1 [&_a]:w-full [&_button]:w-full [&_button]:justify-start"
            >
              {hidden.map((item, index) => (
                <React.Fragment
                  key={isValidElement(item) && item.key != null ? item.key : visible + index}
                >
                  {item}
                </React.Fragment>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export default OverflowActions;
