import { ALPAKA_MODULE } from "@/alpaka/module";
import { BANK_MODULE } from "@/bank/module";
import { DOKUMENTS_MODULE } from "@/dokuments/module";
import { ELEKTRO_MODULE } from "@/elektro/module";
import { FLUSS_MODULE } from "@/fluss/module";
import { KABINET_MODULE } from "@/kabinet/module";
import { KRAPH_MODULE } from "@/kraph/module";
import type { ModuleBuiltins } from "@/core/modules/host/define";
import { registerModules } from "@/core/modules/host/host";
import { LOK_MODULE } from "@/lok/module";
import { LOVEKIT_MODULE } from "@/lovekit/module";
import { MIKRO_MODULE } from "@/mikro/module";
import { OMEROARK_MODULE } from "@/omeroark/module";
import { REKUEST_MODULE } from "@/rekuest/module";

/**
 * Registers every first-party module with the module host. Imported for its
 * side effect by the app's entry (`app/AppProvider`) and nothing else — see
 * `core/modules/host/host` for why registries never import this. A first-party
 * module the host refuses (invalid manifest, clashing ids) is a bug: this
 * throws.
 *
 * Rail order; lok last (it has no rail tile).
 */
export const MODULE_DEFINITIONS = [
  MIKRO_MODULE,
  REKUEST_MODULE,
  FLUSS_MODULE,
  KABINET_MODULE,
  OMEROARK_MODULE,
  KRAPH_MODULE,
  ALPAKA_MODULE,
  ELEKTRO_MODULE,
  LOVEKIT_MODULE,
  DOKUMENTS_MODULE,
  BANK_MODULE,
  LOK_MODULE,
] as const;

const unregister = registerModules(MODULE_DEFINITIONS);

// Dev: editing a module hot-reloads this file (through AppProvider's refresh
// boundary) while the module host store keeps its state, so the new run would
// be refused as a duplicate. The old run leaves the host first.
import.meta.hot?.dispose(unregister);

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
  value: infer I,
) => void
  ? I
  : never;

type Definition = (typeof MODULE_DEFINITIONS)[number];

/** One builtin map, merged across modules with every key kept (types only). */
type Merged<K extends keyof ModuleBuiltins> = UnionToIntersection<
  Definition extends infer D ? (D extends { builtins: { [P in K]: infer V } } ? V : never) : never
>;

export type ModuleActions = Merged<"actions">;
