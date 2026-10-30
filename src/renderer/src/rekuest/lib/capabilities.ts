import type { ActionFilter, ImplementationFilter } from "@/rekuest/api/graphql";

// What a task may do besides computing: ask you (and wait for the answer),
// inform you (show a blok and go on), call other actions — declared with its
// implementation, or decided at run time when the implementation declares the
// dynamic flag. The server answers all of them for actions (some
// implementation does) and implementations alike, under the same names.

export const CAPABILITIES = ["asks", "informs", "calls"] as const;
export const DYNAMIC_CAPABILITIES = ["dynamicAsks", "dynamicInforms", "dynamicCalls"] as const;
export const CAPABILITY_KEYS = [...CAPABILITIES, ...DYNAMIC_CAPABILITIES] as const;

export type Capability = (typeof CAPABILITIES)[number];
export type DynamicCapability = (typeof DYNAMIC_CAPABILITIES)[number];
export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

/** `null` is "either": the facet is not set. `false` is "never". */
export type CapabilityFacets = Record<CapabilityKey, boolean | null>;

/** The capability fields, as both filters have them. */
export type CapabilityFilter = Pick<ActionFilter, CapabilityKey> &
  Pick<ImplementationFilter, CapabilityKey>;

export const NO_CAPABILITY_FACETS: CapabilityFacets = {
  asks: null,
  informs: null,
  calls: null,
  dynamicAsks: null,
  dynamicInforms: null,
  dynamicCalls: null,
};

/** Only the facets that are set, so an empty filter stays `{}`. */
export const buildCapabilityFilter = (
  facets: Partial<CapabilityFacets> | null | undefined,
): CapabilityFilter => {
  const filter: CapabilityFilter = {};
  for (const key of CAPABILITY_KEYS) {
    const value = facets?.[key];
    if (value !== null && value !== undefined) filter[key] = value;
  }
  return filter;
};

export const countCapabilityFacets = (facets: Partial<CapabilityFacets>) =>
  CAPABILITY_KEYS.filter((key) => facets[key] !== null && facets[key] !== undefined)
    .length;

/** The set facets of a partial update, for a caller that holds them apart. */
export const pickCapabilityFacets = (
  next: Partial<CapabilityFacets>,
): Partial<CapabilityFacets> => {
  const picked: Partial<CapabilityFacets> = {};
  for (const key of CAPABILITY_KEYS) {
    if (key in next) picked[key] = next[key] ?? null;
  }
  return picked;
};
