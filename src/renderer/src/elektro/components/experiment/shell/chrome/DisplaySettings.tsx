import { Grid3x3 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  MAX_GRID_SPACING_PX,
  MIN_GRID_SPACING_PX,
  useViewerStore,
  useViewerStoreApi,
} from "../../platform/stores/viewerStore";

/**
 * The reading aids, behind ONE button.
 *
 * They belong together — the grid and the value axis are the same tick set, and
 * the spacing is the same knob for both — and none of them is reached for often
 * enough to earn a permanent slot in the HUD. So: one icon in the button row,
 * everything else folded away. Each control subscribes to one scalar, as the rest
 * of `ExperimentModeControls` does.
 */
export const DisplaySettings = () => {
  const showValueAxis = useViewerStore((s) => s.showValueAxis);
  const showGrid = useViewerStore((s) => s.showGrid);
  const gridSpacingPx = useViewerStore((s) => s.gridSpacingPx);
  const viewerApi = useViewerStoreApi();
  const on = showValueAxis || showGrid;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon-sm"
          variant={on ? "default" : "outline"}
          title="Axis labels and grid"
          aria-label="Axis labels and grid"
          aria-pressed={on}
        >
          <Grid3x3 />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-60 p-3">
        <div className="flex flex-col gap-3">
          <SettingRow
            label="Y axis labels"
            hint="Tick labels down the left edge, in each row's own units"
          >
            <Switch
              size="sm"
              checked={showValueAxis}
              onCheckedChange={(next) => viewerApi.getState().setShowValueAxis(next)}
            />
          </SettingRow>

          <SettingRow label="Grid" hint="Lines at the time ticks and the value ticks">
            <Switch
              size="sm"
              checked={showGrid}
              onCheckedChange={(next) => viewerApi.getState().setShowGrid(next)}
            />
          </SettingRow>

          <div className="flex flex-col gap-1.5 border-t border-border/40 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/90">Spacing</span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {gridSpacingPx} px
              </span>
            </div>
            <Slider
              min={MIN_GRID_SPACING_PX}
              max={MAX_GRID_SPACING_PX}
              step={10}
              value={[gridSpacingPx]}
              disabled={!on}
              onValueChange={([next]) => viewerApi.getState().setGridSpacingPx(next)}
            />
            <p className="text-[10px] leading-snug text-muted-foreground">
              Roughly how far apart ticks fall. Steps stay round numbers, so the
              spacing is a target, not a promise.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const SettingRow = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) => (
  <label className="flex cursor-pointer items-start justify-between gap-3">
    <span className="flex flex-col gap-0.5">
      <span className="text-xs text-foreground/90">{label}</span>
      <span className="text-[10px] leading-snug text-muted-foreground">{hint}</span>
    </span>
    {children}
  </label>
);
