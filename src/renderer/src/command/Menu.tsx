import { Guard } from "@/app/Arkitekt";
import { useDisplayComponent } from "@/app/display";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandList,
} from "@/components/ui/command";
// The input is used RAW, not through `ui/command`'s `CommandInput`: that one
// wraps itself in a padded `InputGroup` with its own background and border,
// which is exactly the nested "second search bar" this panel must not have.
import { Command as CommandPrimitive } from "cmdk";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SmartLink } from "@/providers/smart/builder";
import { ApplicableDefinitions } from "@/providers/smart/extensions/kabinet/definitions";
import { ApplicableLocalActions } from "@/providers/smart/extensions/local/localactions";
import { ApplicableActions } from "@/providers/smart/extensions/rekuest/actions";
import { ApplicableShortcuts } from "@/providers/smart/extensions/rekuest/shortcuts";
import { Structure } from "@/types";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogPortal } from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useDebounce } from "@uidotdev/usehooks";
import { Search, Sparkles } from "lucide-react";
import { createElement, Suspense, useMemo } from "react";
import { useCommandPalette } from "./CommandPaletteProvider";
import { resolveContextObjects } from "./contextObjects";
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
  object: string;
  link?: boolean;
  context?: "command" | "widget";
}) => {
  const Widget = useDisplayComponent(props.identifier as DisplayIdentifier);

  if (Widget == undefined) {
    return <>No widget found</>;
  }

  const widgetElement = createElement(Widget, {
    small: true,
    object: props.object,
    identifier: props.identifier,
    context: props.context || "widget",
  });

  if (props.link) {
    return (
      <SmartLink identifier={props.identifier} object={props.object}>
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
              object={modifier.id}
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
        object={props.modifier.id}
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

  // Everything that acts on the context. Local actions come first: they are
  // synchronous, so they are on screen the moment the palette opens.
  const actionSources = (
    <>
      <ApplicableLocalActions
        filter={searchFilter}
        objects={objects}
        partners={props.partners}
        onDone={closePalette}
      />
      <Guard.Rekuest>
        <ApplicableShortcuts
          filter={searchFilter}
          objects={objects}
          partners={props.partners}
          onDone={closePalette}
        />
        <ApplicableActions
          filter={searchFilter}
          objects={objects}
          collection={props.collection}
          partners={props.partners}
          onDone={closePalette}
        />
      </Guard.Rekuest>
      <Guard.Kabinet>
        <ApplicableDefinitions
          filter={searchFilter}
          objects={objects}
          partners={props.partners}
          returns={props.returns || []}
        />
      </Guard.Kabinet>
    </>
  );

  // ⌘T opens a new tab — with its own history — which works signed in or out,
  // so the chip shows whenever that is the intent.
  const newTab = intent === "new-tab";

  return (
    <Dialog
      open={context.open}
      onOpenChange={(next) => {
        if (!next) closePalette();
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
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            requestAnimationFrame(() => {
              const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');
              input?.focus();
            });
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
            // The same surface as the search pill — same border, same fill, same
            // translucency — so the panel reads as that control grown rather
            // than as a different object appearing over it. The heavy backdrop
            // blur is what lets a 40%-opaque panel stay legible over a page.
            "border border-border/40 bg-background/40 text-foreground backdrop-blur-xl shadow-2xl",
            "data-[state=open]:animate-palette-in data-[state=closed]:animate-palette-out",
          )}
        >
          <Command
            shouldFilter={false}
            className="bg-transparent [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground/90 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-1 [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:min-h-10 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:transition-colors [&_[cmdk-item][data-selected=true]]:bg-primary/10 [&_[cmdk-item][data-selected=true]]:text-foreground [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4"
          >
            {/* The pill's own row: same height, same padding, same icon, so the
                transition from control to panel has nothing to give it away. */}
            <div className="flex h-8 shrink-0 items-center gap-2 px-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <CommandPrimitive.Input
                data-slot="command-input"
                placeholder={newTab ? "Open in a new tab…" : "Search or run a command…"}
                onValueChange={updateQuery}
                value={context.query}
                className="h-8 w-full min-w-0 flex-1 bg-transparent text-xs outline-hidden placeholder:text-muted-foreground"
              />
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
                    <div key={`object-${m.identifier}-${m.object.id}`}>
                      <DisplayWidget
                        identifier={m.identifier}
                        object={m.object.id}
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
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
