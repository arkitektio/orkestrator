import { MoreHorizontal, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Color, SRGBColorSpace } from "three";
import { SwatchColorPicker } from "@/core/components/color/SwatchColorPicker";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import { Button } from "@/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { useDeleteLayerMutation } from "@/elektro/api/graphql";

/**
 * The edit controls every layer card shares: colour, line width, and the
 * per-layer menu. Small and uncontrolled-looking on purpose — each commits on
 * change through the caller's optimistic write, so there is no "save".
 */

/** Any CSS colour the layer resolved to (`hsl(…)`, `rgba(…)`) → RGBA 0–255. */
const cssToRgba = (css: string): number[] => {
  const color = new Color().setStyle(css, SRGBColorSpace);
  const { r, g, b } = color.getRGB({ r: 0, g: 0, b: 0 } as Color, SRGBColorSpace);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255];
};

/**
 * A layer's colour — the shared swatch picker (`SwatchColorPicker`, the one
 * mikro's intensity layers use). Commits ONCE, when the picker closes: every
 * edit here is a persisted write, and a drag through the square must be one
 * mutation, not fifty.
 *
 * `value` is what is persisted (null: "let the viewer choose"); `resolved` is the
 * colour the layer is actually drawn in, which the swatch shows until someone
 * picks one — so it never claims a colour the lines are not.
 */
export const ColorInput = ({
  value,
  resolved,
  onCommit,
  title = "Colour",
}: {
  value: readonly number[] | null;
  resolved?: string;
  onCommit: (rgba: number[]) => void;
  title?: string;
}) => (
  <SwatchColorPicker
    value={value}
    fallback={resolved ? cssToRgba(resolved) : undefined}
    onCommit={onCommit}
    title={title}
    className="h-4 w-5"
  />
);

const WIDTHS = [0.75, 1.25, 2, 3];

/** Line width in screen pixels, as a handful of steps rather than a slider. */
export const LineWidthSelect = ({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (width: number) => void;
}) => (
  <select
    title="Line width (px)"
    className="h-5 rounded border border-border/60 bg-transparent px-1 font-mono text-[10px]"
    value={WIDTHS.includes(value) ? value : ""}
    onChange={(event) => onCommit(Number(event.currentTarget.value))}
  >
    {!WIDTHS.includes(value) && <option value="">{value}px</option>}
    {WIDTHS.map((w) => (
      <option key={w} value={w}>
        {w}px
      </option>
    ))}
  </select>
);

/**
 * The per-layer menu: kind-specific items first (`children`), then Delete —
 * behind a confirm, because a layer can carry authored state (colour, pickers,
 * an order) that deleting throws away. The DATA is untouched: a layer is a way
 * of looking at a dataset, and the dataset stays.
 */
export const LayerMenu = ({
  layerId,
  label,
  children,
}: {
  layerId: string;
  label: string;
  children?: ReactNode;
}) => {
  const [confirming, setConfirming] = useState(false);
  const [remove, { loading }] = useDeleteLayerMutation({ refetchQueries: ["GetExperimentScene"] });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost" title="Layer options">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {children}
          {children && <DropdownMenuSeparator />}
          <DropdownMenuItem className="text-destructive" onSelect={() => setConfirming(true)}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete layer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{label}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The layer leaves this experiment, with its colour, scale and pickers. The data it
              shows is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={loading}
              onClick={() =>
                void remove({ variables: { id: layerId } }).catch((error: unknown) =>
                  toast.error(
                    `Could not delete the layer: ${error instanceof Error ? error.message : String(error)}`,
                  ),
                )
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
