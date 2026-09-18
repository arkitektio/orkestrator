import { MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteLayerMutation } from "@/elektro/api/graphql";

/**
 * The edit controls every layer card shares: colour, line width, and the
 * per-layer menu. Small and uncontrolled-looking on purpose — each commits on
 * change through the caller's optimistic write, so there is no "save".
 */

const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/** RGBA 0–255 → "#rrggbb" (the colour input has no alpha). */
export const rgbaToHex = (color: readonly number[] | null | undefined, fallback = "#8ab4f8"): string =>
  color && color.length >= 3 ? `#${toHex(color[0])}${toHex(color[1])}${toHex(color[2])}` : fallback;

/** "#rrggbb" → RGBA 0–255, keeping an existing alpha. */
export const hexToRgba = (hex: string, alpha = 255): number[] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [255, 255, 255, alpha];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), alpha];
};

/**
 * A colour swatch that opens the native picker. Commits on the NATIVE `change`
 * event (the picker closing) — React's `onChange` on a colour input fires on
 * every `input` tick, and a drag through the wheel must be one write, not fifty.
 */
export const ColorInput = ({
  value,
  onCommit,
  title = "Colour",
}: {
  value: readonly number[] | null;
  onCommit: (rgba: number[]) => void;
  title?: string;
}) => {
  const ref = useRef<HTMLInputElement | null>(null);
  const latest = useRef({ value, onCommit });
  latest.current = { value, onCommit };
  const hex = rgbaToHex(value);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    const onChange = () => {
      const { value: current, onCommit: commit } = latest.current;
      const next = hexToRgba(input.value, current?.[3] ?? 255);
      if (rgbaToHex(next) !== rgbaToHex(current)) commit(next);
    };
    input.addEventListener("change", onChange);
    return () => input.removeEventListener("change", onChange);
    // Re-attach when the keyed input below is remounted.
  }, [hex]);

  return (
    <input
      ref={ref}
      type="color"
      title={title}
      className="h-4 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
      // Keyed on the value so an optimistic rollback resets the swatch.
      key={hex}
      defaultValue={hex}
    />
  );
};

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
