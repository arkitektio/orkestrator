import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * URL-backed state over react-router, replacing nuqs.
 *
 * nuqs was removed because its react-router adapter is a module-scope
 * singleton bound to `window.location` and `history.pushState`: it cannot see
 * a per-tab memory router, so every tab would have shared one set of query
 * params. This is the same API surface the ten call sites already use —
 * `useQueryState(key, parser)`, `parseAsX`, `.withDefault()` — implemented on
 * `useLocation().search` + `navigate`, which resolve to whichever router is
 * nearest, i.e. the tab's.
 *
 * Semantics kept from nuqs 2.x so the call sites need only change an import:
 * `null` removes the key, and so does setting a value equal to the default
 * (`clearOnDefault`); writes `replace` rather than push, so filter tweaks do not
 * pile up in Back; setters accept an updater function.
 */

export type Parser<T> = {
  parse: (raw: string) => T | null;
  serialize: (value: T) => string;
  /** Present only after `.withDefault()`. */
  defaultValue?: T;
  withDefault: (defaultValue: T) => ParserWithDefault<T>;
};

export type ParserWithDefault<T> = Parser<T> & { defaultValue: T };

const createParser = <T,>(spec: {
  parse: (raw: string) => T | null;
  serialize: (value: T) => string;
}): Parser<T> => ({
  ...spec,
  withDefault(defaultValue: T) {
    return { ...createParser(spec), defaultValue };
  },
});

// ── parsers, matching the nuqs ones the call sites use ──

export const parseAsString = createParser<string>({
  parse: (raw) => raw,
  serialize: (value) => value,
});

export const parseAsBoolean = createParser<boolean>({
  parse: (raw) => (raw === "true" ? true : raw === "false" ? false : null),
  serialize: (value) => String(value),
});

export const parseAsIsoDateTime = createParser<Date>({
  parse: (raw) => {
    const date = new Date(raw);
    // An unparseable date is "no filter", never `Invalid Date` leaking into
    // a GraphQL variable.
    return Number.isNaN(date.getTime()) ? null : date;
  },
  serialize: (value) => value.toISOString(),
});

export const parseAsStringLiteral = <const L extends readonly string[]>(
  values: L,
): Parser<L[number]> =>
  createParser<L[number]>({
    parse: (raw) => (values.includes(raw) ? (raw as L[number]) : null),
    serialize: (value) => value,
  });

export const parseAsArrayOf = <T,>(item: Parser<T>, separator = ","): Parser<T[]> =>
  createParser<T[]>({
    parse: (raw) =>
      raw === ""
        ? []
        : raw
            .split(separator)
            .map((part) => item.parse(part))
            .filter((value): value is T => value !== null),
    serialize: (values) => values.map((value) => item.serialize(value)).join(separator),
  });

// ── batching ──
//
// react-router's `setSearchParams` reads the params it was RENDERED with, so
// four setters called in one handler (`OrgTasksPage` clears four filters at
// once) would each overwrite the last. nuqs batched these; so must this.
// Writes are queued and flushed in one microtask onto the search string as it
// is at flush time, with a single `navigate`. The queue is module-level on the
// assumption that one page owns all the setters firing in a tick — which is
// the case for every current caller — and the flush uses whichever hook
// instance rendered most recently, since they all share that page's router.

type Flush = (pending: Map<string, string | null>) => void;

const pending = new Map<string, string | null>();
let latestFlush: Flush | null = null;
let scheduled = false;

const enqueue = (key: string, value: string | null, flush: Flush) => {
  pending.set(key, value);
  latestFlush = flush;
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    const batch = new Map(pending);
    pending.clear();
    latestFlush?.(batch);
  });
};

// ── the hook ──

type Setter<T> = (value: T | null | ((previous: T) => T | null)) => void;

export function useQueryState<T>(
  key: string,
  parser: ParserWithDefault<T>,
): [T, Setter<T>];
export function useQueryState<T>(key: string, parser: Parser<T>): [T | null, Setter<T | null>];
export function useQueryState<T>(key: string, parser: Parser<T>) {
  const { search } = useLocation();
  const navigate = useNavigate();

  // Refs so the microtask flush sees the CURRENT search string, not the one
  // from the render that enqueued — that is the whole point of batching.
  const searchRef = useRef(search);
  const navigateRef = useRef(navigate);
  useEffect(() => {
    searchRef.current = search;
    navigateRef.current = navigate;
  });

  const raw = new URLSearchParams(search).get(key);
  const parsed = raw === null ? null : parser.parse(raw);
  const value = parsed ?? parser.defaultValue ?? null;

  const flush = useCallback<Flush>((batch) => {
    const params = new URLSearchParams(searchRef.current);
    batch.forEach((serialized, k) => {
      if (serialized === null) params.delete(k);
      else params.set(k, serialized);
    });
    const next = params.toString();
    // Keep the search string stable so the ref is right for the next batch
    // even before react-router re-renders us.
    searchRef.current = next ? `?${next}` : "";
    navigateRef.current({ search: next }, { replace: true });
  }, []);

  const setValue = useCallback<Setter<T | null>>(
    (update) => {
      const previous = (() => {
        // An updater sees the value as the caller sees it — defaulted, and
        // including writes already queued this tick.
        const queued = pending.get(key);
        if (queued !== undefined) {
          const p = queued === null ? null : parser.parse(queued);
          return (p ?? parser.defaultValue ?? null) as T;
        }
        return value as T;
      })();

      const next = typeof update === "function" ? (update as (p: T) => T | null)(previous) : update;

      // `clearOnDefault`: the default is the URL's own meaning of "absent".
      const isDefault =
        parser.defaultValue !== undefined &&
        next !== null &&
        parser.serialize(next) === parser.serialize(parser.defaultValue);

      enqueue(key, next === null || isDefault ? null : parser.serialize(next), flush);
    },
    [key, parser, value, flush],
  );

  return [value, setValue];
}
