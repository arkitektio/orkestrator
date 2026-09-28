import type { OperationHandler } from "@/core/modules/host/operations";
import type { JSONObject } from "@/core/types";
import {
  CreateMandateDocument,
  type CreateMandateMutation,
  type CreateMandateMutationVariables,
  type ManifestInput,
  MandatesDocument,
  RevokeMandateDocument,
  type RevokeMandateMutation,
  type RevokeMandateMutationVariables,
} from "./api/graphql";

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const optionalInt = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) ? value : undefined;

/**
 * `lok.createMandate`: the signed-in user lets an agent app (a deployer)
 * provision clients of one exact app version that act as them. Args
 * `{ agent, manifest, attestation?, agentDeviceId?, maxClients?, expiresInDays? }`;
 * `manifest` is passed through as lok's `ManifestInput` (kabinet's
 * `Release.mandateManifest` is built for exactly this). Answers `{ id }`.
 */
const createMandate: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const agent = optionalString(args.agent);
    if (!agent) throw new Error("A mandate needs the agent app's identifier");
    if (!args.manifest || typeof args.manifest !== "object" || Array.isArray(args.manifest)) {
      throw new Error("A mandate needs the manifest of the app it authorizes");
    }

    const result = await client.mutate<CreateMandateMutation, CreateMandateMutationVariables>({
      mutation: CreateMandateDocument,
      variables: {
        input: {
          agent,
          manifest: args.manifest as unknown as ManifestInput,
          attestation: optionalString(args.attestation),
          agentDeviceId: optionalString(args.agentDeviceId),
          maxClients: optionalInt(args.maxClients),
          expiresInDays: optionalInt(args.expiresInDays),
        },
      },
      refetchQueries: [MandatesDocument],
    });
    const id = result.data?.createMandate.id;
    if (!id) throw new Error("lok did not create the mandate");
    return { id };
  },
};

/**
 * `lok.revokeMandate`: withdraw a mandate the signed-in user granted. lok
 * deletes every client provisioned under it, so running instances are cut off
 * at once. Args `{ id }`; answers `{ id }`.
 */
const revokeMandate: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const id = optionalString(args.id);
    if (!id) throw new Error("Which mandate?");
    await client.mutate<RevokeMandateMutation, RevokeMandateMutationVariables>({
      mutation: RevokeMandateDocument,
      variables: { id },
    });
    return { id };
  },
};

export const LOK_OPERATIONS: Record<string, OperationHandler> = {
  "lok.createMandate": createMandate,
  "lok.revokeMandate": revokeMandate,
};
