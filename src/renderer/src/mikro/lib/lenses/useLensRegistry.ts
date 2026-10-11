import { useMikro } from "@/mikro/api/funcs";
import { lensRegistry, type LensRegistry } from "./lensRegistry";

/**
 * The session's lens registry for the mikro client in scope. Stable for the
 * life of the client, so it is safe in a dependency list.
 *
 * Reads the client, so like every mikro hook it is only called under a
 * `MikroGuard` (the scene and the dialogs that use it already are).
 */
export const useLensRegistry = (): LensRegistry => lensRegistry(useMikro());
