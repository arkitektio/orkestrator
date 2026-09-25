import { useDisplayComponent } from "@/core/app/display";
import { Badge } from "@/core/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandList,
} from "@/core/components/ui/command";
// The input is used RAW, not through `ui/command`'s `CommandInput`: that one
// wraps itself in a padded `InputGroup` with its own background and border,
// which is exactly the nested "second search bar" this panel must not have.
import { Command as CommandPrimitive } from "cmdk";
import { Dialog } from "@/core/components/ui/dialog";
import { cn } from "@/core/lib/utils";
import { SmartLink } from "@/core/providers/smart/builder";
import { PaletteSections } from "@/core/providers/smart/extensions/PaletteSections";
import { SmartMenuWrappers } from "@/core/providers/smart/extensions/SmartMenuWrappers";
import { Structure } from "@/core/types";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogPortal } from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useDebounce } from "@uidotdev/usehooks";
import { Search, Sparkles } from "lucide-react";
import { createElement, Suspense, useMemo, useRef } from "react";
import { VoicePaletteBadge } from "@/core/voice";
import { useCommandPalette } from "./CommandPaletteProvider";
import { usePaletteGrow } from "./usePaletteGrow";
import { resolveContextObjects } from "./contextObjects";
import { CyclingPlaceholder } from "./CyclingPlaceholder";
import { ModulePaletteSources } from "@/core/app/modules/registries";
import { ApplicableNavigation } from "./sources/ApplicableNavigation";
import { ApplicableRecents } from "./sources/ApplicableRecents";
import { ApplicableEntitySearch } from "./sources/entity/ApplicableEntitySearch";
import {
  Context,
  ExtensionContext,
  Modifier,
  useSmartExtension,
} from "./ExtensionContext";

type DisplayIdentifier = Parameters<typeof useDisplayComponent>[0];

export const DisplayWidget = (props: {
  identifier: string;
  id: string;
  link?: boolean;
  context?: "command" | "widget";
}) => {
  const Widget = useDisplayComponent(props.identifier as DisplayIdentifier);

  if (Widget == undefined) {
    return <>No widget found</>;
  }

  const widgetElement = createElement(Widget, {
    small: true,
    id: props.id,
    identifier: props.identifier,
    context: props.context || "widget",
  });

  if (props.link) {
    return (
      <SmartLink identifier={props.identifier} object={props.id}>
        <Suspense>{widgetElement}</Suspense>
      </SmartLink>
    );
  }

  return <Suspense>{widgetElement}</Suspense>;
};

export const DisplayWidgetHub = () => {
  const { modifiers } = useSmartExtension();

  return (
    <>
      {modifiers.map((modifier) => {
        return (
          <>
            <DisplayWidget
              identifier={modifier.identifier}
              id={modifier.id}
              context="widget"
            />
          </>
        );
      })}
    </>
  );
};

export const ModifierRender = (props: { modifier: Modifier; context?: "command" | "widget" }) => {
  if (props.modifier.type === "smart") {
    return (
      <DisplayWidget
        identifier={props.modifier.identifier}
        id={props.modifier.id}
        context={props.context || "widget"}
      />
    );
  }
  if (props.modifier.type === "search") {
    return <Badge>Search</Badge>;
  }
  return <>Unknown Modifier</>;
};

const ShortcutBadge = (props: { children: React.ReactNode }) => {
  return (
    <span className="inline-flex items-center rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur-sm">
      {props.children}
    </span>
  );
};

const ContextCard = (props: {
  children: React.ReactNode;
  onRemove?: () => void;
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-linear-to-br from-background/95 to-backgroundpaired/55 p-2.5 shadow-[0_18px_36px_-26px_rgba(0,0,0,0.55)] transition-colors hover:border-primary/30">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-primary/45 to-transparent opacity-70" />
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
          <Sparkles className="h-3 w-3" />
        </div>
        {props.onRemove ? (
          <button
            type="button"
            onClick={props.onRemove}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-background/75 text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <Cross2Icon className="h-3 w-3" />
            <span className="sr-only">Remove context</span>
          </button>
        ) : (
          <div className="h-6 w-6" />
        )}
      </div>
      <div className="min-w-0 text-xs [&_*]:max-w-full">{props.children}</div>
    </div>
  );
};

/**
 * A custom Command Menu a la VSCode.
 * This renders and filters the commands that are *currently* registered in the command provider.
 * And allows for the execution of these commands.
 *
 **/
export const CommandMenu = (props: {
  objects?: Structure[];
  collection?: string;
  partners?: Structure[];
  returns?: string[];
}) => {
  // State and the hotkey now live in `CommandPaletteProvider`: this component is
  // mounted exactly once (by `CommandMenuHost`), and used to be mounted per page
  // with a keydown listener each — so two pages on screen meant two listeners
  // and a toggle that cancelled itself out.
  const {
    open,
    query,
    modifiers,
    intent,
    closePalette,
    setQuery: updateQuery,
    activateModifier,
    removeModifier,
  } = useCommandPalette();

  const context: Context = useMemo(
    () => ({ open, query, modifiers }),
    [open, query, modifiers],
  );
  const debouncedContext = useDebounce(context, 100); // Debounce the context to prevent too many rerenders.

  // Stable provider value: only changes when the debounced context does, so
  // extension consumers don't re-render on every keystroke of the raw query.
  const extensionContextValue = useMemo(
    () => ({ ...debouncedContext, activateModifier, removeModifier }),
    [debouncedContext, activateModifier, removeModifier],
  );
  // The search the query children see: the DEBOUNCED query, so a keystroke
  // does not fan out into one request per extension (shortcuts, actions ×2,
  // definitions ×2). The raw `context.query` stays on the input itself.
  const searchFilter = debouncedContext.query;
  // One stable array: `props.objects || []` inline handed every child a fresh
  // literal per render, defeating their memos. The page's objects, unless a
  // search result was made context (⇧), which then takes over.
  const objects = useMemo(
    () => resolveContextObjects(debouncedContext.modifiers, props.objects ?? []),
    [debouncedContext.modifiers, props.objects],
  );
  const hasSmartModifier = context.modifiers.some((m) => m.type === "smart");
  // With something in context, what you can DO with it leads the list.
  const hasContext = objects.length > 0;

  // Everything that acts on the context: every registered section that offers
  // itself to the palette (local actions first, by priority: synchronous, so
  // on screen the moment the palette opens).
  const actionSources = (
    <PaletteSections
      filter={searchFilter}
      objects={objects}
      partners={props.partners}
      returns={props.returns}
      collection={props.collection}
      onDone={closePalette}
    />
  );

  // ⌘T opens a new tab — with its own history — which works signed in or out,
  // so the chip shows whenever that is the intent.
  const newTab = intent === "new-tab";

  const inputRef = useRef<HTMLInputElement | null>(null);
  // The panel grows out of the pill and shrinks back into it; a dismiss goes
  // through `requestClose` so the shrink can finish before the unmount.
  const { ref: panelRef, requestClose } = usePaletteGrow(context.open, closePalette);

  return (
    <Dialog
      open={context.open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      // Non-modal, because there is no overlay any more. A modal Radix dialog
      // marks everything outside `aria-hidden` and blocks its pointer events —
      // which, with nothing dimmed, would leave the app looking usable while
      // silently swallowing every click. Escape and click-outside still close
      // it: those live on the content's dismissable layer, not the overlay.
      modal={false}
    >
      <DialogPortal>
        {/* No overlay. The palette unfolds from the rail's search pill into a
            corner of a window that stays legible behind it; dimming the whole
            app to open it would contradict that and reintroduce the modal feel
            this layout is trying to shed. Radix's dismissable layer still
            handles click-outside and Escape without one. */}
        <DialogPrimitive.Content
          ref={panelRef}
          // ⌘K must land the caret in THIS input. Radix's default would focus
          // the first tabbable in the content, which is the input, but the
          // open animation can be mid-flight at that moment, so the focus is
          // placed now AND again on the next frame. By ref, never by a
          // document-wide query: the New Tab page and every combobox on the
          // page carry `command-input` too, and a query returned whichever of
          // them came first in the DOM — never this one, which lives in a
          // portal at the end of the body.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const focus = () => inputRef.current?.focus({ preventScroll: true });
            focus();
            requestAnimationFrame(focus);
          }}
          style={{
            // Sits exactly on top of the rail's search pill, which hides itself
            // while this is open. There is no second search field: this panel's
            // top row IS the pill, grown.
            top: "var(--palette-origin-top, 5.5rem)",
            left: "var(--palette-origin-left, 0.5rem)",
          }}
          className={cn(
            // Width capped at 30vw as asked, with a floor so it stays usable on
            // a narrow window: at 1000px, 30vw is 300px, narrower than the rows
            // it has to hold.
            "fixed z-50 w-[min(92vw,max(26rem,30vw))] overflow-hidden rounded-lg",
            // Same border and radius as the search pill, so the panel reads as
            // that control grown — but near-opaque, not the pill's 40%. A
            // translucent panel needed a heavy backdrop blur to stay legible,
            // and re-blurring the page under a clip-path that changes every
            // frame is what made the unfold stutter. At 95% nothing behind it
            // competes with the results, and there is nothing to blur.
            "border border-border/50 bg-background/95 text-foreground shadow-2xl",
            // No CSS open/close animation: `usePaletteGrow` animates the box.
          )}
        >
          <SmartMenuWrappers context={{ objects, partners: props.partners, onDone: closePalette }}>
          <Command
            shouldFilter={false}
            className="bg-transparent [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground/90 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-1 [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:min-h-10 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:transition-colors [&_[cmdk-item][data-selected=true]]:bg-primary/10 [&_[cmdk-item][data-selected=true]]:text-foreground [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4"
          >
            {/* The pill's own row: same height, same padding, same icon, so the
                transition from control to panel has nothing to give it away. */}
            <div className="flex h-8 shrink-0 items-center gap-2 px-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <div className="relative flex h-8 min-w-0 flex-1 items-center">
                <CommandPrimitive.Input
                  ref={inputRef}
                  // Its own slot, so the voice runtime and anything else that
                  // wants THE palette's input can find it unambiguously.
                  data-slot="palette-input"
                  // The visible placeholder is the fading overlay below; this
                  // one stays for assistive tech.
                  placeholder={newTab ? "Open in a new tab…" : "Search, ask or do…"}
                  onValueChange={updateQuery}
                  value={context.query}
                  className="h-8 w-full min-w-0 flex-1 bg-transparent text-xs outline-hidden placeholder:text-transparent"
                />
                {!context.query && (
                  <CyclingPlaceholder
                    words={newTab ? ["Open in a new tab…"] : undefined}
                    className="absolute inset-0 flex items-center text-xs text-muted-foreground"
                  />
                )}
              </div>
              {/* The microphone, while the query is being dictated. */}
              <VoicePaletteBadge />
              {newTab && (
                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  New tab
                </span>
              )}
              <DialogPrimitive.Close className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
                <Cross2Icon className="h-3 w-3" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* Everything below the pill's own height — revealed by the second
                phase of the animation, which is the "drop down". */}
            <div className="border-t border-border/50">
              {(context.modifiers.length > 0 || (!hasSmartModifier && props.objects && props.objects.length > 0)) && (
                <div className="space-y-1.5 border-b border-border/50 p-2">
                  {context.modifiers.map((m, index) => (
                    <ContextCard key={`modifier-${m.type}-${index}`} onRemove={() => removeModifier(index)}>
                      <ModifierRender modifier={m} context="widget" />
                    </ContextCard>
                  ))}
                  {!hasSmartModifier && props.objects?.map((m) => (
                    <div key={`object-${m.identifier}-${m.id}`}>
                      <DisplayWidget
                        identifier={m.identifier}
                        id={m.id}
                        context="command"
                      />
                    </div>
                  ))}
                </div>
              )}

              <CommandList className="max-h-[24rem] px-1.5 pb-2 pt-1.5">
                {context.query && (
                  <CommandEmpty className="py-8 text-center text-xs text-muted-foreground">
                    No results for “{context.query}”.
                  </CommandEmpty>
                )}
                <ExtensionContext.Provider value={extensionContextValue}>
                  {hasContext && actionSources}
                  {/* Where you were, only while nothing is typed. */}
                  <ApplicableRecents
                    filter={searchFilter}
                    objects={objects}
                    partners={props.partners}
                    onDone={closePalette}
                  />
                  {/* Then, unguarded: the source that still works with no
                      backend configured at all. */}
                  <ApplicableNavigation
                    filter={searchFilter}
                    objects={objects}
                    partners={props.partners}
                    onDone={closePalette}
                  />
                  {!hasContext && actionSources}
                  {/* Whatever was typed can be asked, so a query that matches
                      nothing still has a row. Below what matched — a hit beats
                      a question — and above the entity search, whose late
                      results would otherwise push it around. */}
                  <ModulePaletteSources
                    filter={searchFilter}
                    objects={objects}
                    partners={props.partners}
                    onDone={closePalette}
                  />
                  {/* Last: the only async source, so late results never shove
                      the synchronous rows out from under the cursor. */}
                  <ApplicableEntitySearch
                    filter={searchFilter}
                    objects={objects}
                    partners={props.partners}
                    onDone={closePalette}
                  />
                </ExtensionContext.Provider>
              </CommandList>

              <div className="flex items-center justify-end gap-1.5 border-t border-border/50 px-2 py-1.5">
                <ShortcutBadge>⌘K</ShortcutBadge>
                <ShortcutBadge>⌘T new tab</ShortcutBadge>
              </div>
            </div>
          </Command>
          </SmartMenuWrappers>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
