export type QueryData = { [key: string]: any };

export type Group = {
  name: string;
  object?: string;
  omit?: boolean;
  type?: string;
  groups?: Group[];
  data?: Datum[];
  schema?: Schema;
};

export type Axis = {
  key: string;
  type: string;
  reducer?: Reducer;
  parser?: Parser;
};

export type Schema = {
  axis: Axis[];
};

export const reducers = ["SUM", "AVG", "COUNT", "MIN", "MAX"] as const;
export const parsers = ["INT", "DATE", "FLOAT", "STRING", "OBJECT"] as const;

export type Accesors = "value" | "object" | "type";
export type Accessor = `${string}_${Accesors}`;
export type ValueAccesor = `${string}_value`;
export type ObjectAccesor = `${string}_object`;
export type TypeAccesor = `${string}type`;

export type Datum<T extends string | number | Date = string | number | Date> = {
  [key: ValueAccesor]: T;
  [key: ObjectAccesor]: string;
  [key: TypeAccesor]: string;
};

export type ParsingDatum<
  T extends string | number | Date = string | number | Date
> = {
  key: string;
  value: T;
  object: string;
  type: string;
  reducer?: Reducer;
  parser?: Parser;
};

export type ParsingSchema<
  T extends string | number | Date = string | number | Date
> = {
  key: string;
  type: string;
};

export type PlotTree = Group;

export const keywords = [
  "GROUP",
  "GROUPS",
  "DATUM",
  "DATA",
  "NAME",
  "VALUE",
  "TYPE",
  "__typename",
  "OBJECT",
  "FLATDATUM",
  "DATUMS",
  "KEY",
  "OMIT",
] as const;

export type Keyword = typeof keywords[number];
export type Reducer = typeof reducers[number];
export type Parser = typeof parsers[number];
