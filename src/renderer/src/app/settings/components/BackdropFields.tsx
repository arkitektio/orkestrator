import { customBackdropStyle, RAIL_BACKDROPS, type RailBackdropId } from "@/app/components/chrome/railBackdrops";
import { useStoredBackdropUrl } from "@/app/components/chrome/RailBackdrop";
import { acceptsFiles } from "@/core/dnd/files";
import { useCanDrop, useDropTarget } from "@/core/dnd/react";
import { toast } from "@/core/notify";
import { BACKDROP_ACCEPT, clearBackdrop, importBackdrop } from "@/core/settings/store/backdropStore";
import type { Settings } from "@/core/settings/store/validator";
import { Button } from "@/core/ui/button";
import { FormDescription, FormLabel } from "@/core/ui/form";
import { Slider } from "@/core/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { cn } from "@/core/util/utils";
import { ImagePlus } from "lucide-react";
import { useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { useFormContext, useWatch } from "react-hook-form";

/** A small rail: what the sidebar would look like with this behind it. */
const Swatch = ({
  label,
  selected,
  onSelect,
  style,
  children,
  buttonRef,
  highlighted,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  style?: CSSProperties;
  children?: ReactNode;
  buttonRef?: Ref<HTMLButtonElement>;
  highlighted?: boolean;
}) => (
  <button
    ref={buttonRef}
    type="button"
    aria-pressed={selected}
    aria-label={label}
    onClick={onSelect}
    className="group flex w-20 flex-col items-center gap-1.5 text-xs text-muted-foreground aria-pressed:text-foreground"
  >
    <span
      className={cn(
        "relative block h-28 w-full overflow-hidden rounded-lg border bg-sidebar transition-shadow",
        "group-hover:ring-1 group-hover:ring-primary/25 dark:group-hover:ring-secondary/40 group-aria-pressed:ring-2 group-aria-pressed:ring-primary",
        highlighted && "ring-2 ring-primary",
      )}
    >
      {style ? <span aria-hidden className="absolute inset-0" style={style} /> : null}
      {/* The rail's own furniture, so the backdrop is judged behind something. */}
      <span aria-hidden className="absolute inset-x-2 top-2 flex flex-col gap-1">
        <span className="h-1.5 w-8 rounded-full bg-foreground/25" />
        <span className="h-1.5 w-12 rounded-full bg-foreground/15" />
        <span className="h-1.5 w-10 rounded-full bg-foreground/15" />
      </span>
      {children}
    </span>
    {label}
  </button>
);

/**
 * Settings → Appearance → Sidebar: what is painted behind the rail. Nothing,
 * one of the two backdrops that come with the app, or an image of the user's
 * own (a PNG with transparency shows the sidebar, or the glass, through it).
 *
 * These are form fields, not direct writes: the settings form saves the whole
 * object and would put back whatever a write around it had changed.
 */
export const BackdropFields = () => {
  const { control, setValue } = useFormContext<Settings>();
  const backdrop = useWatch({ control, name: "railBackdrop" });
  const version = useWatch({ control, name: "railBackdropVersion" });
  const opacity = useWatch({ control, name: "railBackdropOpacity" });
  const fit = useWatch({ control, name: "railBackdropFit" });

  // Shown in its swatch whether or not it is the chosen one, so it can be
  // chosen again without picking the file a second time.
  const storedUrl = useStoredBackdropUrl(true, version);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const choose = (value: RailBackdropId) => setValue("railBackdrop", value, { shouldDirty: true });

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importBackdrop(file);
      setValue("railBackdropVersion", Date.now(), { shouldDirty: true });
      choose("custom");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not use that image.");
    }
  };

  const remove = async () => {
    await clearBackdrop().catch(() => undefined);
    setValue("railBackdropVersion", Date.now(), { shouldDirty: true });
    if (backdrop === "custom") choose("none");
  };

  const dragging = useCanDrop(acceptsFiles);
  const { ref: dropRef, isOver } = useDropTarget({
    accepts: acceptsFiles,
    onDrop: (payload) => {
      if (payload.origin === "external") void upload(payload.files[0]);
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <FormLabel>Backdrop</FormLabel>
        <FormDescription>
          Painted behind the sidebar. Your own image keeps its transparency: where it is clear, the sidebar shows
          through.
        </FormDescription>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <Swatch label="None" selected={backdrop === "none"} onSelect={() => choose("none")} />
        {(Object.keys(RAIL_BACKDROPS) as (keyof typeof RAIL_BACKDROPS)[]).map((id) => (
          <Swatch
            key={id}
            label={RAIL_BACKDROPS[id].label}
            selected={backdrop === id}
            onSelect={() => choose(id)}
            style={RAIL_BACKDROPS[id].style}
          />
        ))}
        <Swatch
          buttonRef={dropRef as Ref<HTMLButtonElement>}
          label="Your image"
          selected={backdrop === "custom"}
          // With an image in store this chooses it; without one it asks for one.
          onSelect={() => (storedUrl ? choose("custom") : inputRef.current?.click())}
          style={storedUrl ? customBackdropStyle(storedUrl, fit) : undefined}
          highlighted={isOver}
        >
          {!storedUrl || dragging ? (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-sidebar/70 text-[10px]">
              <ImagePlus className="size-4" aria-hidden />
              {dragging ? (isOver ? "Release" : "Drop here") : "Upload"}
            </span>
          ) : null}
        </Swatch>
        <input
          ref={inputRef}
          type="file"
          accept={BACKDROP_ACCEPT}
          className="hidden"
          aria-label="Backdrop image"
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            // The same file picked again must fire `change` again.
            event.target.value = "";
          }}
        />
      </div>

      {storedUrl ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Replace image
          </Button>
          <Button type="button" variant="ghost" onClick={() => void remove()}>
            Remove image
          </Button>
        </div>
      ) : null}

      {backdrop !== "none" ? (
        <div className="flex flex-row items-center justify-between gap-4">
          <FormLabel>Backdrop strength ({Math.round(opacity * 100)}%)</FormLabel>
          <Slider
            className="w-40"
            min={10}
            max={100}
            step={5}
            value={[Math.round(opacity * 100)]}
            onValueChange={([value]) => setValue("railBackdropOpacity", value / 100, { shouldDirty: true })}
          />
        </div>
      ) : null}

      {backdrop === "custom" ? (
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <FormLabel>Placement</FormLabel>
            <FormDescription>Fill covers the sidebar; Bottom keeps the image whole at its foot.</FormDescription>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            value={fit}
            // Radix reports "" when the pressed item is pressed again; a
            // placement cannot be un-chosen, so ignore that.
            onValueChange={(value) => {
              if (value) setValue("railBackdropFit", value as Settings["railBackdropFit"], { shouldDirty: true });
            }}
            aria-label="Backdrop placement"
          >
            <ToggleGroupItem value="fill" className="px-3">
              Fill
            </ToggleGroupItem>
            <ToggleGroupItem value="bottom" className="px-3">
              Bottom
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      ) : null}
    </div>
  );
};

export default BackdropFields;
