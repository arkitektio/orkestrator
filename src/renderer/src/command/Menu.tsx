import { Guard } from "@/app/Arkitekt";
import { useDisplayComponent } from "@/app/display";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
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
import { Sparkles } from "lucide-react";
import { createElement, Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
  const [context, setContext] = useState<Context>({
    open: false,
    query: "",
    modifiers: [],
  });
  const debouncedContext = useDebounce(context, 100); // Debounce the context to prevent too many rerenders.

  const updateQuery = (query: string) => {
    setContext((c) => ({ ...c, query }));
  };

  const activateModifier = useCallback((modifier: Modifier) => {
    setContext((c) => ({
      ...c,
      modifiers: [...c.modifiers, modifier],
      query: "",
    }));
  }, []);

  const removeModifier = useCallback((index: number) => {
    setContext((c) => ({
      ...c,
      modifiers: c.modifiers.filter((_, i) => i !== index),
    }));
  }, []);

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
  // literal per render, defeating their memos.
  const objects = useMemo(() => props.objects ?? [], [props.objects]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "m" && (e.metaKey || e.ctrlKey)) {
      // Open the command menu with cmd+m
      e.preventDefault();
      setContext((c) => ({ ...c, open: !c.open }));
    }
    if (e.key === "," && (e.metaKey || e.ctrlKey)) {
      // Open a fresh command menu with cmd+,, without any modifiers.
      e.preventDefault();
      setContext((c) => ({ ...c, open: !c.open, query: "", modifiers: [] }));
    }
  }, []);

  useEffect(() => {
    // Attach listener to window to ensure it catches all keyboard events
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  return (
    <Dialog
      open={context.open}
      onOpenChange={(open) => setContext((c) => ({ ...c, open: open }))}
    >
      <DialogPortal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-[radial-gradient(circle_at_top,oklch(from_var(--primary)_l_c_h_/_0.15),transparent_38%),radial-gradient(circle_at_bottom,oklch(from_var(--accent)_l_c_h_/_0.10),transparent_30%)] bg-background/50 backdrop-blur-3xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "",
          )}
        />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            requestAnimationFrame(() => {
              const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');
              input?.focus();
            });
          }}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-[min(92vw,52rem)] translate-x-[-50%] translate-y-[-50%] gap-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "",
          )}
        >
          {(context.modifiers.length > 0 || (props.objects && props.objects.length > 0)) && (
            <div className="overflow-hidden rounded-[22px] border border-border/60 bg-linear-to-br from-background/95 via-background/92 to-backgroundpaired/90 p-3 sm:p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-sm">
              <div className="space-y-2">
                {context.modifiers.map((m, index) => (
                  <div key={`modifier-${m.type}-${index}`} className="space-y-1.5">
                    <div className="overflow-hidden rounded-lg border border-border/60 bg-background/80 p-2">
                      <ModifierRender modifier={m} context="command" />
                    </div>
                    <ContextCard onRemove={() => removeModifier(index)}>
                      <ModifierRender modifier={m} context="widget" />
                    </ContextCard>
                  </div>
                ))}
                {props.objects?.map((m) => (
                  <div key={`object-${m.identifier}-${m.object.id}`} className="space-y-1.5">
                      <DisplayWidget
                        identifier={m.identifier}
                        object={m.object.id}
                        context="command"
                      />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="shadow-xl relative overflow-hidden rounded-[28px] border border-border/60 bg-linear-to-br from-background/96 via-background/94 to-background/90 shadow-[0_40px_120px_-50px_rgba(0,0,0,0.65)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />



              <DialogPrimitive.Close className="absolute right-4 top-4 z-200 cursor-pointer">
                <Cross2Icon className="h-3.5 w-3.5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>

            <div className="relative p-3 sm:p-4">
            <Command
              shouldFilter={false}
              className="relative overflow-hidden rounded-[22px] border border-border/60 bg-background/80 shadow-inner shadow-black/5  [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground/90 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-1 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-12 [&_[cmdk-input]]:text-sm [&_[cmdk-item]]:min-h-11 [&_[cmdk-item]]:rounded-xl [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:transition-colors [&_[cmdk-item][data-selected=true]]:bg-primary/10 [&_[cmdk-item][data-selected=true]]:text-foreground [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4"
            >
              <div className="border-b border-border/50 bg-linear-to-r from-primary/6 via-transparent to-transparent px-1 pb-1 pt-1">
                <CommandInput
                  placeholder="Type a command or search..."
                  onValueChange={updateQuery}
                  value={context.query}
                  className=""
                  capture={true}
                />
              </div>
              <CommandList className="max-h-[26rem] px-2 pb-3 pt-1">
                {context.query && (
                  <CommandEmpty className="py-10 text-sm text-muted-foreground">
                    No actions matched this query.
                  </CommandEmpty>
                )}
                <ExtensionContext.Provider value={extensionContextValue}>
                  <Guard.Rekuest>
                    <ApplicableShortcuts
                      filter={searchFilter}
                      objects={objects}
                      partners={props.partners}
                      onDone={() => setContext((c) => ({ ...c, open: false }))}
                    />
                    <ApplicableActions
                      filter={searchFilter}
                      objects={objects}
                      collection={props.collection}
                      partners={props.partners}
                      onDone={() => setContext((c) => ({ ...c, open: false }))}
                    />
                  </Guard.Rekuest>
                  <ApplicableLocalActions
                    filter={searchFilter}
                    objects={objects}
                    partners={props.partners}
                    onDone={() => setContext((c) => ({ ...c, open: false }))}
                  />
                  <Guard.Kabinet>
                    <ApplicableDefinitions
                      filter={searchFilter}
                      objects={objects}
                      partners={props.partners}
                      returns={props.returns || []}
                    />
                  </Guard.Kabinet>
                </ExtensionContext.Provider>
              </CommandList>
              <div className="border-t border-border/50 bg-linear-to-r from-transparent via-primary/6 to-transparent px-2 py-2">
                <div className="flex items-center justify-end gap-2">
                  <ShortcutBadge>Ctrl/⌘ M</ShortcutBadge>
                  <ShortcutBadge>Ctrl/⌘ , reset</ShortcutBadge>
                </div>
              </div>
            </Command>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
