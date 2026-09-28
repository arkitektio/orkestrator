import { z } from "zod";
import { AliasStorageSchema } from "../fakts/aliasStorageSchema";
import { FaktsEndpointSchema } from "../fakts/endpointSchema";
import { ActiveFaktsSchema } from "../fakts/faktsSchema";
import { TokenResponseSchema } from "../fakts/tokenSchema";

/**
 * One login's session: the deployment it talks to, what fakts rendered for
 * it, its token, and the alias each service answered on last.
 *
 * This is the shape a profile stores (`StoredProfile.session`) and the one
 * the provider holds live. It used to live next to the four flat
 * `localStorage` keys this app persisted before profiles existed; those, and
 * their migration, are gone — this schema is all that remained of them.
 */
export const StoredArkitektSessionSchema = z.object({
  endpoint: FaktsEndpointSchema,
  fakts: ActiveFaktsSchema,
  token: TokenResponseSchema,
  aliasMap: AliasStorageSchema,
});

export type StoredArkitektSession = z.infer<typeof StoredArkitektSessionSchema>;
