import React from "react";

/**
 * What the host tells a row about its pin. `SectionHost` provides it around
 * every row; `CommandActionRow` reads it, so a module's row gets the pin
 * toggle without knowing pins exist.
 */
export type RowPin = {
  pinned: boolean;
  /** Pinned by declaration: shown, but not the user's to remove. */
  locked: boolean;
  toggle: () => void;
};

const RowPinContext = React.createContext<RowPin | null>(null);

export const RowPinProvider = RowPinContext.Provider;

export const useRowPin = () => React.useContext(RowPinContext);

/**
 * Where pinned rows are lifted to: the "Pinned" group at the start of the
 * menu they are in. `undefined` = this surface has none (the ⌘K palette),
 * `null` = it has one that is not mounted yet.
 */
const PinnedSlotContext = React.createContext<HTMLElement | null | undefined>(undefined);

export const PinnedSlotProvider = PinnedSlotContext.Provider;

export const usePinnedSlot = () => React.useContext(PinnedSlotContext);

/** The smart menu draws its rows tighter than the palette does. */
const CompactRowsContext = React.createContext(false);

export const CompactRowsProvider = CompactRowsContext.Provider;

export const useCompactRows = () => React.useContext(CompactRowsContext);

/**
 * The related context a row is listed for (`SmartContextProps.related`), by
 * key; null for the page's own. Scopes the row's cmdk value, so an action
 * listed for the page and for its whole lens is two rows, not one.
 */
const RowScopeContext = React.createContext<string | null>(null);

export const RowScopeProvider = RowScopeContext.Provider;

/** The cmdk value a row given `value` ends up with: what to look it up by. */
export const useScopedRowValue = (value: string | undefined) => {
  const scope = React.useContext(RowScopeContext);
  return scope !== null && value !== undefined ? `${scope}::${value}` : value;
};
