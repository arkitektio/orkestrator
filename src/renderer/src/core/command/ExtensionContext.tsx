import React, { useContext } from "react";

export type SmartModifier<I extends string = string> = {
  type: "smart";
  identifier: I;
  id: string;
  label?: string;
};

export type SearchModifier = {
  type: "search";
};

export type Modifier = SmartModifier | SearchModifier;

export type Context = {
  open: boolean;
  query: string;
  modifiers: Modifier[];
};

export type ExtensionContextType = Context & {
  activateModifier: (modifier: Modifier) => void;
  removeModifier: (index: number) => void;
};

export const ExtensionContext = React.createContext<ExtensionContextType>({
  open: false,
  query: "",
  activateModifier: (_modifier: Modifier) => { },
  removeModifier: (_index: number) => { },
  modifiers: [],
});

export const useExtension = () => useContext(ExtensionContext);

export const selectSmarts = <T extends string>(
  modifiers: Modifier[],
  identifier?: T,
): SmartModifier<T>[] => {
  return modifiers.filter(
    (c) =>
      c.type === "smart" &&
      (identifier == undefined || c.identifier == identifier),
  ) as SmartModifier<T>[];
};

/** Extensions that work on Smart Models */
export const useSmartExtension = <T extends string>(identifier?: T) => {
  const { modifiers } = useExtension();
  const meModifiers = selectSmarts(modifiers, identifier);
  return {
    modifiers: meModifiers,
    multiple: meModifiers.length > 1,
    active: meModifiers.length > 0,
  };
};
