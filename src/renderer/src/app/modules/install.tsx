import { ALPAKA_MODULE } from "@/alpaka/module";
import { DOKUMENTS_MODULE } from "@/dokuments/module";
import { ELEKTRO_MODULE } from "@/elektro/module";
import { FLUSS_MODULE } from "@/fluss/module";
import { KABINET_MODULE } from "@/kabinet/module";
import { KRAPH_MODULE } from "@/kraph/module";
import type { ModuleBuiltins } from "@/lib/module-host/define";
import { installModules } from "@/lib/module-host/installed";
import { LOK_MODULE } from "@/lok/module";
import { LOVEKIT_MODULE } from "@/lovekit/module";
import { MIKRO_MODULE } from "@/mikro/module";
import { OMEROARK_MODULE } from "@/omeroark/module";
import { REKUEST_MODULE } from "@/rekuest/module";

/**
 * Installs every first-party module's builtins. Imported for its side effect
 * by the app's entry (`app/AppProvider`) and nothing else — see
 * `lib/module-host/installed` for why registries never import this.
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
  LOK_MODULE,
] as const;

installModules(MODULE_DEFINITIONS);

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
