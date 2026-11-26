import { stableJson } from "@/core/smart/structure";
import {
  DemandKind,
  PortDemandInput,
  PortKind,
  PortMatchInput,
} from "@/rekuest/api/graphql";
import React from "react";
import type { JSONObject, Structure } from "@/core/types";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import type { SmartSectionContext } from "@/core/smart/extensions/section";

/**
 * The port demands the menu asks the servers with: "an action whose first arg
 * takes one of these, whose second takes one of those, returning that".
 *
 * One builder for every section (rekuest actions, shortcuts, the batch
 * variant, kabinet definitions) and for their prefetch, so the
 * variables are byte-identical wherever they are built — the Apollo cache key
 * is the serialised `filters`, and a prefetch only pays off if the later hook
 * reads the same entry. Nothing here emits an `undefined`-valued key.
 */

export type DemandSource = Pick<SmartContextProps, "objects" | "partners" | "returns">;

export type Arity = "none" | "one" | "many";

export type SmartDemands = {
  /** Stable identity of everything below; memo deps and prefetch dedupe. */
  key: string;
  objects: Arity;
  partners: Arity;
  /** objects as one Structure (one) or a List of them (many) at arg 0. */
  single: PortDemandInput[];
  /** objects always as one Structure at arg 0 — the run-per-item form. */
  batch: PortDemandInput[];
};

export const arityOf = (items: readonly unknown[] | undefined): Arity =>
  !items || items.length === 0 ? "none" : items.length === 1 ? "one" : "many";

/**
 * What one side of the selection PROVIDES, as rekuest descriptors: the
 * descriptors every structure on that side shares. A list whose items
 * disagree provides nothing in common, and the match stays structural.
 */
export const sideDescriptors = (
  items: readonly Pick<Structure, "descriptors">[] | undefined,
): JSONObject | undefined => {
  const first = items?.[0]?.descriptors;
  if (!items || !first || Object.keys(first).length === 0) return undefined;
  const key = stableJson(first);
  return items.every((item) => item.descriptors && stableJson(item.descriptors) === key)
    ? first
    : undefined;
};

/** Only the fields the demands read, so equal-but-new arrays share a key. */
export const demandKey = (source: DemandSource): string => {
  const objectDescriptors = sideDescriptors(source.objects);
  const partnerDescriptors = sideDescriptors(source.partners);
  return [
    source.objects[0]?.identifier ?? "",
    arityOf(source.objects),
    source.partners?.[0]?.identifier ?? "",
    arityOf(source.partners),
    source.returns?.join(",") ?? "",
    objectDescriptors ? stableJson(objectDescriptors) : "",
    partnerDescriptors ? stableJson(partnerDescriptors) : "",
  ].join("|");
};

const structureAt = (at: number, identifier: string, descriptors?: JSONObject): PortMatchInput => ({
  at,
  kind: PortKind.Structure,
  identifier,
  ...(descriptors
    ? {
        descriptors: Object.keys(descriptors)
          .sort()
          .map((key) => ({ key, value: descriptors[key] })),
      }
    : {}),
});

// The child index is the position INSIDE the list, so it is 0 for either side.
const listOfStructureAt = (at: number, identifier: string, descriptors?: JSONObject): PortMatchInput => ({
  at,
  kind: PortKind.List,
  children: [structureAt(0, identifier, descriptors)],
});

const args = (matches: PortMatchInput[]): PortDemandInput => ({
  kind: DemandKind.Args,
  matches,
});

const sideDemand = (
  at: number,
  identifier: string | undefined,
  arity: Arity,
  options?: { forceSingle?: boolean; descriptors?: JSONObject },
): PortDemandInput | null => {
  if (!identifier || arity === "none") return null;
  if (arity === "one" || options?.forceSingle) {
    return args([structureAt(at, identifier, options?.descriptors)]);
  }
  return args([listOfStructureAt(at, identifier, options?.descriptors)]);
};

const returnsDemand = (returns: readonly string[] | undefined): PortDemandInput | null =>
  returns
    ? {
        kind: DemandKind.Returns,
        matches: returns.map((identifier, index) => structureAt(index, identifier)),
      }
    : null;

const present = <T,>(items: (T | null)[]): T[] =>
  items.filter((item): item is T => item !== null);

export const buildDemands = (source: DemandSource): SmartDemands => {
  const objectIdentifier = source.objects[0]?.identifier;
  const partnerIdentifier = source.partners?.[0]?.identifier;
  const objects = arityOf(source.objects);
  const partners = arityOf(source.partners);

  const objectDescriptors = sideDescriptors(source.objects);
  const partnerDemand = sideDemand(1, partnerIdentifier, partners, {
    descriptors: sideDescriptors(source.partners),
  });
  const returns = returnsDemand(source.returns);

  const single = present([
    sideDemand(0, objectIdentifier, objects, { descriptors: objectDescriptors }),
    partnerDemand,
    returns,
  ]);
  const batch = present([
    sideDemand(0, objectIdentifier, objects, { forceSingle: true, descriptors: objectDescriptors }),
    partnerDemand,
    returns,
  ]);

  return {
    key: demandKey(source),
    objects,
    partners,
    single,
    batch,
  };
};

/** Memoized on `demandKey`, so a fresh `objects` array per render does not rebuild. */
export const useSmartDemands = (source: DemandSource): SmartDemands => {
  const key = demandKey(source);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => buildDemands(source), [key]);
};

/**
 * The page's own selection: in the mount for one of its related contexts it
 * is `primary`, and the one query is built from it there too.
 */
export const pageSource = (ctx: SmartSectionContext) => ctx.primary ?? ctx;

/**
 * The demands of the page's related contexts (its whole lens), which the
 * selection's query ORs in. Every mount builds the same list, so Apollo sends
 * one request for all of them. Used by every section that asks with demands
 * (rekuest's Run and Shortcuts, kabinet's Installable).
 */
export const useRelatedDemands = (ctx: SmartSectionContext) => {
  const key = (ctx.related ?? []).map((related) => demandKey({ objects: related.objects })).join("‖");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(
    () =>
      (ctx.related ?? [])
        .filter((related) => related.objects.length > 0)
        .map((related) => buildDemands({ objects: related.objects }).single),
    [key],
  );
};

/** Which context a row belongs to: what its first arg takes, as the demands asked at 0. */
export const firstArgIdentifier = (item: { args: readonly { identifier?: string | null }[] }) =>
  item.args[0]?.identifier ?? undefined;
