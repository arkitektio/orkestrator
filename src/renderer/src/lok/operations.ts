import type { OperationHandler } from "@/core/modules/host/operations";
import type { JSONObject } from "@/core/types";
import {
  CollaborationLinksDocument,
  type CollaborationLinksQuery,
  type CollaborationLinkFragment,
  CreateMandateDocument,
  type CreateMandateMutation,
  type CreateMandateMutationVariables,
  IsMemberOfDocument,
  type IsMemberOfQuery,
  type IsMemberOfQueryVariables,
  type ManifestInput,
  MandatesDocument,
  RequestMembershipDocument,
  type RequestMembershipMutation,
  type RequestMembershipMutationVariables,
  RevokeCollaborationLinkDocument,
  type RevokeCollaborationLinkMutation,
  type RevokeCollaborationLinkMutationVariables,
  RevokeMandateDocument,
  type RevokeMandateMutation,
  type RevokeMandateMutationVariables,
  ShareCollaborationDocument,
  type ShareCollaborationMutation,
  type ShareCollaborationMutationVariables,
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

/**
 * `lok.isMemberOf`: is the signed-in user a member of this organization on
 * the server they are signed into? Args `{ organization }` (its id); answers
 * `{ member }`. `false` also for an organization that does not exist: lok
 * never says which ids are real. Asked fresh every time, so an approval shows
 * on the next look.
 */
const isMemberOf: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const organization = optionalString(args.organization);
    if (!organization) throw new Error("Which organization?");
    const result = await client.query<IsMemberOfQuery, IsMemberOfQueryVariables>({
      query: IsMemberOfDocument,
      variables: { organization },
      fetchPolicy: "network-only",
    });
    return { member: result.data.mycontext.memberOf };
  },
};

/**
 * `lok.requestMembership`: the signed-in user asks to join an organization
 * they are not in; its administrators answer on their Team page. Args
 * `{ organization, reason? }`; answers `{ sent: true }` whatever the id
 * names, for the same reason `lok.isMemberOf` answers `false`.
 */
const requestMembership: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const organization = optionalString(args.organization);
    if (!organization) throw new Error("Which organization?");
    await client.mutate<RequestMembershipMutation, RequestMembershipMutationVariables>({
      mutation: RequestMembershipDocument,
      variables: { input: { organization, reason: optionalString(args.reason) } },
    });
    return { sent: true };
  },
};

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

/** A link as the share dialog reads it: what it grants in one collaboration, and how much of it is used. */
const asLink = (invite: CollaborationLinkFragment, instance: string, collaboration: string): JSONObject => ({
  id: invite.id,
  inviteUrl: invite.inviteUrl,
  expiresAt: invite.expiresAt ?? null,
  uses: invite.uses,
  maxUses: invite.maxUses ?? null,
  mesh: invite.mesh,
  valid: invite.valid,
  roles:
    invite.collaborations?.find((entry) => entry.instance === instance && entry.collaboration === collaboration)?.roles ?? [],
});

const grants = (invite: CollaborationLinkFragment, instance: string, collaboration: string) =>
  !!invite.collaborations?.some((entry) => entry.instance === instance && entry.collaboration === collaboration);

/**
 * `lok.shareCollaboration`: a link (a collaboration invite) that grants one collaboration of a
 * service instance to whoever opens it and signs in, with `roles` holding only inside it. Args
 * `{ instance, collaboration, roles?, expiresInDays? (null: never), maxUses? (null: anyone),
 * allowMesh? }`; answers the link, as `lok.collaborationLinks` lists it.
 */
const shareCollaboration: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const instance = optionalString(args.instance);
    const collaboration = optionalString(args.collaboration);
    if (!instance || !collaboration) throw new Error("Which collaboration, of which instance?");
    const result = await client.mutate<ShareCollaborationMutation, ShareCollaborationMutationVariables>({
      mutation: ShareCollaborationDocument,
      variables: {
        input: {
          collaborations: [{ instance, collaboration, roles: stringList(args.roles) }],
          expiresInDays: args.expiresInDays === null ? null : optionalInt(args.expiresInDays),
          maxUses: optionalInt(args.maxUses) ?? null,
          allowMesh: args.allowMesh !== false,
        },
      },
      refetchQueries: [CollaborationLinksDocument],
    });
    const invite = result.data?.createInvite;
    if (!invite) throw new Error("lok did not make the link");
    return asLink(invite, instance, collaboration);
  },
};

/**
 * `lok.collaborationLinks`: the links the signed-in user may see (their own, or all as an admin)
 * that grant one collaboration of a service instance. Args `{ instance, collaboration }`;
 * answers a list of links.
 */
const collaborationLinks: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const instance = optionalString(args.instance);
    const collaboration = optionalString(args.collaboration);
    if (!instance || !collaboration) throw new Error("Which collaboration, of which instance?");
    const result = await client.query<CollaborationLinksQuery>({ query: CollaborationLinksDocument, fetchPolicy: "network-only" });
    return result.data.invites.filter((invite) => grants(invite, instance, collaboration)).map((invite) => asLink(invite, instance, collaboration));
  },
};

/**
 * `lok.revokeLink`: cancel a collaboration link, and take what it granted back from everyone who
 * accepted it. Args `{ id }`; answers `{ id }`.
 */
const revokeLink: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const id = optionalString(args.id);
    if (!id) throw new Error("Which link?");
    await client.mutate<RevokeCollaborationLinkMutation, RevokeCollaborationLinkMutationVariables>({
      mutation: RevokeCollaborationLinkDocument,
      variables: { id },
      refetchQueries: [CollaborationLinksDocument],
    });
    return { id };
  },
};

export const LOK_OPERATIONS: Record<string, OperationHandler> = {
  "lok.shareCollaboration": shareCollaboration,
  "lok.collaborationLinks": collaborationLinks,
  "lok.revokeLink": revokeLink,
  "lok.createMandate": createMandate,
  "lok.revokeMandate": revokeMandate,
  "lok.isMemberOf": isMemberOf,
  "lok.requestMembership": requestMembership,
};
