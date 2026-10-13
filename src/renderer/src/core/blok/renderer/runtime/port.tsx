import * as React from 'react';

/**
 * The action input a component is standing in for, when it is rendered as a
 * port's widget rather than inside a blok.
 *
 * A widget is declared on a structure or an argument, but what it must offer
 * is a fact of the port it lands on: which structure the port is typed on,
 * and what it requires of the object it is handed. The form provides both
 * here, so a picker narrows itself without the app author restating them as
 * props. Absent inside an ordinary blok.
 */
export type BlokPort = {
  /** The structure the port is typed on, e.g. "@mikro/arraylens". */
  identifier?: string;
  /** What the port requires of the object, as `{key, operator, value}`. */
  requires?: readonly {key: string; operator: string; value?: unknown}[];
};

const BlokPortContext = React.createContext<BlokPort | undefined>(undefined);

export const BlokPortProvider = BlokPortContext.Provider;

export const useBlokPort = (): BlokPort | undefined => React.useContext(BlokPortContext);
