import { Blend, Layers, Rows3, type LucideIcon } from "lucide-react";
import { Button } from "@/core/ui/button";
import { ButtonGroup } from "@/core/ui/button-group";
import { useViewerStore, useViewerStoreApi, type LayoutMode } from "../stores/viewerStore";

const LAYOUT_OPTIONS: { value: LayoutMode; icon: LucideIcon; title: string }[] = [
  {
    value: "STACKED",
    icon: Rows3,
    title: "Stacked — one row per layer, each on its own scale",
  },
  {
    value: "SHARED",
    icon: Layers,
    title:
      "Shared — layers measuring the same thing overlaid on ONE scale, so amplitudes compare",
  },
  {
    value: "OVERLAY",
    icon: Blend,
    title:
      "Overlay — layers measuring the same thing in one plot, each on its own scale, so a small and a large signal are both visible",
  },
];

/**
 * How a plot's layers share the screen: stacked, shared or overlaid.
 *
 * By default a session choice (`setLayoutMode`), which is all a timeline wants.
 * A module that remembers the choice passes `onChange` and writes it itself; one
 * whose plot cannot do a mode leaves it out of `modes`, and words the rest in
 * its own terms with `titles` (a chart of values lays panels out, not rows).
 */
export const LayoutModeToggle = ({
  modes,
  onChange,
  titles,
}: {
  modes?: readonly LayoutMode[];
  onChange?: (mode: LayoutMode) => void;
  titles?: Partial<Record<LayoutMode, string>>;
}) => {
  const layoutMode = useViewerStore((s) => s.layoutMode);
  const viewerApi = useViewerStoreApi();
  const options = modes ? LAYOUT_OPTIONS.filter((o) => modes.includes(o.value)) : LAYOUT_OPTIONS;
  return (
    <ButtonGroup>
      {options.map((option) => {
        const active = layoutMode === option.value;
        return (
          <Button
            key={option.value}
            variant={active ? "default" : "outline"}
            size="xs"
            className={active ? "h-7 w-8 p-0" : "h-7 w-8 bg-black p-0"}
            title={titles?.[option.value] ?? option.title}
            aria-pressed={active}
            onClick={() =>
              active
                ? undefined
                : onChange
                  ? onChange(option.value)
                  : viewerApi.getState().setLayoutMode(option.value)
            }
          >
            <option.icon className="h-3.5 w-3.5" />
          </Button>
        );
      })}
    </ButtonGroup>
  );
};
