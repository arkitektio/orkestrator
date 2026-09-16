import { Structure } from "@/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import { useTabId } from "./tabs/TabContext";
import { useActiveTabIdOrNull } from "./tabs/TabsProvider";

import { Modifier } from "./ExtensionContext";

/**
 * One palette, mounted once, fed by whatever page is open.
 *
 * `CommandMenu` used to own its own state AND its own hotkey listener, and was
 * mounted per page — in `ListPageLayout`, `ModelPageLayout` and five module home
 * pages. Two consequences, both bad: on the Hero dashboard (which uses neither
 * layout) the palette did not exist at all, and on any screen with two mounts
 * both listeners fired and the dialog toggled twice, i.e. not at all.
 *
 * So state and the listener move here, `CommandMenu` becomes a single render
 * point, and a page contributes its context by CALLING a hook instead of
 * mounting a component. Same shape as the dialog system (`createDialogProvider`
 * + the `app/dialog.tsx` registry), which is the convention in this codebase for
 * "one renderer, many callers".
 */

/** What a page contributes: the things the action extensions operate on. */
export type CommandPageContext = {
  objects?: Structure[];
  partners?: Structure[];
  returns?: string[];
  collection?: string;
};

/**
 * What picking a result should DO.
 *
 * `navigate` goes there in the active tab. `new-tab` opens the result in a
 * new tab with its own history, which is what ⌘T means: the palette is the
 * address bar of a tab that does not exist yet, and the thing you choose is
 * what fills it.
 */
export type CommandIntent = "navigate" | "new-tab";

export type CommandPaletteValue = {
  open: boolean;
  query: string;
  modifiers: Modifier[];
  intent: CommandIntent;
  /** The innermost mounted page's context — see `useCommandContext`. */
  pageContext: CommandPageContext;
  openPalette: (options?: { fresh?: boolean; intent?: CommandIntent }) => void;
  closePalette: () => void;
  togglePalette: (options?: { fresh?: boolean; intent?: CommandIntent }) => void;
  setQuery: (query: string) => void;
  activateModifier: (modifier: Modifier) => void;
  removeModifier: (index: number) => void;
};

const noop = () => {};

const CommandPaletteContext = createContext<CommandPaletteValue>({
  open: false,
  query: "",
  modifiers: [],
  intent: "navigate",
  pageContext: {},
  openPalette: noop,
  closePalette: noop,
  togglePalette: noop,
  setQuery: noop,
  activateModifier: noop,
  removeModifier: noop,
});

export const useCommandPalette = () => useContext(CommandPaletteContext);

const RegistryContext = createContext<{
  register: (id: string, context: CommandPageContext, tabId: string | null) => void;
  unregister: (id: string) => void;
}>({ register: noop, unregister: noop });

/**
 * Contribute this page's objects to the palette for as long as it is mounted.
 *
 * Replaces `<CommandMenu objects={…} />`. Registrations form a stack and the
 * LAST one wins: a model page mounted inside a list page is the more specific
 * context, and it is the one mounted later.
 *
 * Each registration remembers the tab it was made in. Warm tabs stay MOUNTED
 * while hidden, so their pages stay registered; without the tab id the palette
 * would keep offering whichever tab's page happened to mount last, not the one
 * being looked at.
 */
export const useCommandContext = (context: CommandPageContext) => {
  const id = useId();
  const tabId = useTabId();
  const { register, unregister } = useContext(RegistryContext);

  // Depend on the contents, not the object identity — callers construct the
  // context inline and would otherwise re-register on every render.
  const objects = context.objects;
  const partners = context.partners;
  const returns = context.returns;
  const collection = context.collection;

  const stable = useMemo<CommandPageContext>(
    () => ({ objects, partners, returns, collection }),
    [objects, partners, returns, collection],
  );

  useEffect(() => {
    register(id, stable, tabId);
    return () => unregister(id);
  }, [id, stable, tabId, register, unregister]);
};

export const CommandPaletteProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [query, setQueryState] = useState("");
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [intent, setIntent] = useState<CommandIntent>("navigate");
  const [stack, setStack] = useState<
    { id: string; tabId: string | null; context: CommandPageContext }[]
  >([]);
  const activeTabId = useActiveTabIdOrNull();

  const register = useCallback((id: string, context: CommandPageContext, tabId: string | null) => {
    setStack((current) => [...current.filter((e) => e.id !== id), { id, tabId, context }]);
  }, []);

  const unregister = useCallback((id: string) => {
    setStack((current) => current.filter((e) => e.id !== id));
  }, []);

  const openPalette = useCallback(
    (options: { fresh?: boolean; intent?: CommandIntent } = {}) => {
      setOpen(true);
      setIntent(options.intent ?? "navigate");
      if (options.fresh) {
        setQueryState("");
        setModifiers([]);
      }
    },
    [],
  );

  const closePalette = useCallback(() => {
    setOpen(false);
    // The intent belongs to one opening. Leaving it set would make the next
    // plain ⌘K silently open tabs.
    setIntent("navigate");
  }, []);

  const togglePalette = useCallback(
    (options: { fresh?: boolean; intent?: CommandIntent } = {}) => {
      setOpen((current) => {
        if (current) {
          setIntent("navigate");
          return false;
        }
        setIntent(options.intent ?? "navigate");
        if (options.fresh) {
          setQueryState("");
          setModifiers([]);
        }
        return true;
      });
    },
    [],
  );

  const activateModifier = useCallback((modifier: Modifier) => {
    setModifiers((current) => [...current, modifier]);
    setQueryState("");
  }, []);

  const removeModifier = useCallback((index: number) => {
    setModifiers((current) => current.filter((_, i) => i !== index));
  }, []);

  // ── the one hotkey listener ──
  //
  // Capture phase, on `window`, as the per-page version was: the palette has to
  // win over whatever has focus, including inputs and the scene's own key
  // handling.
  // `togglePalette` is a `useCallback` with no dependencies, so its identity is
  // stable for the provider's lifetime and this effect binds exactly once.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) {
        return;
      }
      // A held key repeats, and each repeat would toggle — so holding ⌘K
      // strobes the palette instead of opening it.
      if (e.repeat || e.defaultPrevented) {
        return;
      }
      // Escape hatch for editors that own their own ⌘K chords (Monaco, the blok
      // editor). Greppable opt-out, no registry to keep in sync.
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-command-hotkey='off']")) {
        return;
      }

      // ⌘K is the one people arrive expecting. It always opens clean.
      if (e.key === "k") {
        e.preventDefault();
        togglePalette({ fresh: true });
        return;
      }

      // ⌘T is "new tab": the palette becomes the address bar of a tab that does
      // not exist yet, and whatever is chosen opens in it.
      if (e.key === "t") {
        e.preventDefault();
        togglePalette({ fresh: true, intent: "new-tab" });
        return;
      }

      // ⌘M and ⌘, predate this and are muscle memory for existing users; they
      // cost nothing to keep. ⌘M preserves context, ⌘, resets it.
      if (e.key === "m") {
        e.preventDefault();
        togglePalette();
        return;
      }
      if (e.key === ",") {
        e.preventDefault();
        togglePalette({ fresh: true });
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [togglePalette]);

  // The innermost page of the tab being looked at. A registration made
  // outside any tab (`tabId === null`) belongs to the chrome and always counts.
  const pageContext = useMemo(() => {
    const visible = stack.filter((e) => e.tabId === null || e.tabId === activeTabId);
    return visible.length > 0 ? visible[visible.length - 1].context : {};
  }, [stack, activeTabId]);

  const registry = useMemo(() => ({ register, unregister }), [register, unregister]);

  const value = useMemo<CommandPaletteValue>(
    () => ({
      open,
      query,
      modifiers,
      intent,
      pageContext,
      openPalette,
      closePalette,
      togglePalette,
      setQuery: setQueryState,
      activateModifier,
      removeModifier,
    }),
    [
      open,
      query,
      modifiers,
      intent,
      pageContext,
      openPalette,
      closePalette,
      togglePalette,
      activateModifier,
      removeModifier,
    ],
  );

  return (
    <RegistryContext.Provider value={registry}>
      <CommandPaletteContext.Provider value={value}>
        {children}
      </CommandPaletteContext.Provider>
    </RegistryContext.Provider>
  );
};

export default CommandPaletteProvider;
