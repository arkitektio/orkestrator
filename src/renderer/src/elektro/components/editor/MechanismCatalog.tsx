import { Guard } from "@/core/app/Arkitekt";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ParameterFragment, useListMechanismsQuery } from "../../api/graphql";

/**
 * Per-parameter metadata used to ground a mechanism-parameter value input: the
 * declared physical `dimension` and the units to offer in the dropdown. This is
 * exactly the `Parameter` port fragment the elektro backend exposes.
 */
export type MechanismParamMeta = ParameterFragment;

/** mechanism name → (parameter key → its declared metadata). */
type Catalog = Map<string, Map<string, MechanismParamMeta>>;

const EMPTY_CATALOG: Catalog = new Map();

const CatalogContext = createContext<Catalog>(EMPTY_CATALOG);

/**
 * Runs the mechanism-catalogue query and provides the (mechanism, param) →
 * metadata lookup. Only mounted when elektro is ready (the query fires on
 * mount) — see `MechanismCatalogProvider`.
 */
const MechanismCatalogInner = ({ children }: { children: ReactNode }) => {
  const { data } = useListMechanismsQuery();
  const catalog = useMemo<Catalog>(() => {
    const map: Catalog = new Map();
    for (const mech of data?.mechanisms ?? []) {
      const params = new Map<string, MechanismParamMeta>();
      for (const p of mech.parameters) params.set(p.key, p);
      map.set(mech.name, params);
    }
    return map;
  }, [data]);

  return (
    <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>
  );
};

/**
 * Provides the mechanism-parameter catalogue to the model editor so value inputs
 * can source their unit dropdown from each parameter's declared units. The query
 * is guarded from the outside (convention #1) — when elektro is unavailable the
 * children still render and lookups fall back to the empty catalogue (free-form
 * quantity entry).
 */
export const MechanismCatalogProvider = ({ children }: { children: ReactNode }) => (
  <Guard.Elektro unavailable={<>{children}</>}>
    <MechanismCatalogInner>{children}</MechanismCatalogInner>
  </Guard.Elektro>
);

/**
 * Look up the declared metadata for a `(mechanism, param)` pair. Returns
 * `undefined` when the pair is not in the catalogue (unknown/free-text names, or
 * elektro unavailable) — callers should degrade to free-form quantity entry.
 */
export const useMechanismParamMeta = (
  mechanism: string,
  param: string,
): MechanismParamMeta | undefined =>
  useContext(CatalogContext).get(mechanism)?.get(param);
