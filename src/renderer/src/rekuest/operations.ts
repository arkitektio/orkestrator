import type { OperationHandler } from "@/core/modules/host/operations";
import type { JSONObject } from "@/core/types";
import {
  CreateBlokDocument,
  type CreateBlokInput,
  type CreateBlokMutation,
  type CreateBlokMutationVariables,
} from "./api/graphql";

/**
 * `rekuest.installBlok`: copy a blok from elsewhere (kabinet's
 * `RepoBlok.installInput`) into a custom blok. Args are a `CreateBlokInput`
 * with its `origin`, so installing again updates the same blok in place;
 * answers `{ id }`.
 */
const installBlok: OperationHandler = {
  service: "rekuest",
  run: async (client, args: JSONObject) => {
    if (typeof args.name !== "string" || typeof args.origin !== "string") {
      throw new Error("Which blok, from where?");
    }
    const result = await client.mutate<CreateBlokMutation, CreateBlokMutationVariables>({
      mutation: CreateBlokDocument,
      variables: { input: args as unknown as CreateBlokInput },
      refetchQueries: ["ListBloks"],
    });
    const blok = result.data?.createBlok;
    if (!blok) throw new Error("rekuest did not install the blok");
    return { id: blok.id };
  },
};

export const REKUEST_OPERATIONS: Record<string, OperationHandler> = {
  "rekuest.installBlok": installBlok,
};
