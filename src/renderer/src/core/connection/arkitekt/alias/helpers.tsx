import { Alias } from "../fakts/faktsSchema";

export const aliasToHttpPath = (alias: Alias, append: string): string => {
  let url = alias.ssl ? "https://" : "http://";

  url += alias.host;
  if (alias.port) {
    url += `:${alias.port}`;
  }

  if (alias.path) {
    url += `/${alias.path}`;
  }

  if (append) {
    url += `/${append}`;
  }

  return url;
};

export const aliasToWsPath = (alias: Alias, append: string): string => {
  let url = alias.ssl ? "wss://" : "ws://";

  url += alias.host;
  if (alias.port) {
    url += `:${alias.port}`;
  }

  if (alias.path) {
    url += `/${alias.path}`;
  }

  if (append) {
    url += `/${append}`;
  }

  return url;
};

/** Would a client built for `a` talk to the same place as one built for `b`? */
export const sameAlias = (a: Alias | undefined, b: Alias | undefined): boolean =>
  !!a &&
  !!b &&
  a.id === b.id &&
  a.host === b.host &&
  (a.port ?? null) === (b.port ?? null) &&
  (a.path ?? null) === (b.path ?? null) &&
  a.ssl === b.ssl &&
  a.challenge === b.challenge;
