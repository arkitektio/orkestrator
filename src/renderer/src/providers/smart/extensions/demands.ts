import type { PortDemandInput as KabinetPortDemandInput } from "@/kabinet/api/graphql";
import {
  ActionDemandInput,
  DemandKind,
  PortDemandInput,
  PortKind,
  PortMatchInput,
} from "@/rekuest/api/graphql";
import React from "react";
import type { SmartContextProps } from "./types";

/**
 * The port demands the menu asks the servers with: "an action whose first arg
 * takes one of these, whose second takes one of those, returning that".
 *
 * One builder for every section (rekuest actions, shortcuts, implementations,
 * the batch variants, kabinet definitions) and for the prefetcher, so the
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
  implementation: ActionDemandInput;
  batchImplementation: ActionDemandInput;
};

export const arityOf = (items: readonly unknown[] | undefined): Arity =>
  !items || items.length === 0 ? "none" : items.length === 1 ? "one" : "many";

/** Only the fields the demands read, so equal-but-new arrays share a key. */
export const demandKey = (source: DemandSource): string =>
  [
    source.objects[0]?.identifier ?? "",
    arityOf(source.objects),
    source.partners?.[0]?.identifier ?? "",
    arityOf(source.partners),
    source.returns?.join(",") ?? "",
  ].join("|");

const structureAt = (at: number, identifier: string): PortMatchInput => ({
  at,
  kind: PortKind.Structure,
  identifier,
});

// The child index is the position INSIDE the list, so it is 0 for either side.
const listOfStructureAt = (at: number, identifier: string): PortMatchInput => ({
  at,
  kind: PortKind.List,
  children: [structureAt(0, identifier)],
});

const args = (matches: PortMatchInput[]): PortDemandInput => ({
  kind: DemandKind.Args,
  matches,
});

const sideDemand = (
  at: number,
  identifier: string | undefined,
  arity: Arity,
  options?: { forceSingle?: boolean },
): PortDemandInput | null => {
  if (!identifier || arity === "none") return null;
  if (arity === "one" || options?.forceSingle) return args([structureAt(at, identifier)]);
  return args([listOfStructureAt(at, identifier)]);
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

export const buildImplementationDemand = (
  demands: readonly PortDemandInput[],
): ActionDemandInput => {
  const argMatches = demands
    .filter((demand) => demand.kind === DemandKind.Args)
    .flatMap((demand) => demand.matches ?? []);
  const returnMatches = demands
    .filter((demand) => demand.kind === DemandKind.Returns)
    .flatMap((demand) => demand.matches ?? []);

  const forceArgLength = argMatches.length
    ? Math.max(...argMatches.map((match) => match.at ?? 0)) + 1
    : undefined;
  const forceReturnLength = returnMatches.length
    ? Math.max(...returnMatches.map((match) => match.at ?? 0)) + 1
    : undefined;

  return {
    ...(argMatches.length ? { argMatches } : {}),
    ...(typeof forceArgLength === "number" ? { forceArgLength } : {}),
    ...(returnMatches.length ? { returnMatches } : {}),
    ...(typeof forceReturnLength === "number" ? { forceReturnLength } : {}),
  };
};

export const buildDemands = (source: DemandSource): SmartDemands => {
  const objectIdentifier = source.objects[0]?.identifier;
  const partnerIdentifier = source.partners?.[0]?.identifier;
  const objects = arityOf(source.objects);
  const partners = arityOf(source.partners);

  const partnerDemand = sideDemand(1, partnerIdentifier, partners);
  const returns = returnsDemand(source.returns);

  const single = present([
    sideDemand(0, objectIdentifier, objects),
    partnerDemand,
    returns,
  ]);
  const batch = present([
    sideDemand(0, objectIdentifier, objects, { forceSingle: true }),
    partnerDemand,
    returns,
  ]);

  return {
    key: demandKey(source),
    objects,
    partners,
    single,
    batch,
    implementation: buildImplementationDemand(single),
    batchImplementation: buildImplementationDemand(batch),
  };
};

/**
 * Kabinet's generated `PortDemandInput` is field-for-field the same input with
 * its own copies of the enums (same string values — pinned by `demands.test.ts`).
 */
export const toKabinetDemands = (
  demands: readonly PortDemandInput[],
): KabinetPortDemandInput[] => demands as unknown as KabinetPortDemandInput[];

/** Memoized on `demandKey`, so a fresh `objects` array per render does not rebuild. */
export const useSmartDemands = (source: DemandSource): SmartDemands => {
  const key = demandKey(source);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => buildDemands(source), [key]);
};
