import type { OperationHandler } from "@/core/modules/host/operations";
import type { JSONObject } from "@/core/types";
import { SERVER_PAGE_CAP } from "@/core/connection/graphql/cachePolicies";
import {
  BugReportsDocument,
  CreateBugReportDocument,
  type CreateBugReportMutation,
  type CreateBugReportMutationVariables,
  CollaborationLinksDocument,
  CollaborationsDocument,
  type CollaborationsQuery,
  type CollaborationsQueryVariables,
  type CollaborationFragment,
  CreateCollaborationDocument,
  type CreateCollaborationMutation,
  type CreateCollaborationMutationVariables,
  type CollaborationLinksQuery,
  type CollaborationLinksQueryVariables,
  type CollaborationLinkFragment,
  CreateMandateDocument,
  MandateStatusesDocument,
  type MandateStatusesQuery,
  type MandateStatusesQueryVariables,
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
 * `lok.mandateStatus`: do these mandates still work? Asked before something
 * is started under one (kabinet, before deploying under a release approval:
 * its own record does not know that the mandate expired or was withdrawn in
 * lok). Args `{ ids }`; answers `{ [id]: { live, expiresAt, revokedAt } }`,
 * read fresh. A mandate lok does not show the caller is left out: unknown,
 * not dead.
 */
const mandateStatus: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const ids = [...new Set(Array.isArray(args.ids) ? args.ids.filter((id): id is string => typeof id === "string") : [])];
    // One request per 100 ids (lok's page cap); a failed one leaves its ids unknown.
    const chunks = Array.from({ length: Math.ceil(ids.length / SERVER_PAGE_CAP) }, (_, i) =>
      ids.slice(i * SERVER_PAGE_CAP, (i + 1) * SERVER_PAGE_CAP),
    );
    const pages = await Promise.all(
      chunks.map((chunk) =>
        client
          .query<MandateStatusesQuery, MandateStatusesQueryVariables>({
            query: MandateStatusesDocument,
            variables: { ids: chunk, limit: chunk.length },
            fetchPolicy: "network-only",
          })
          .then((result) => result.data?.mandates ?? [])
          .catch(() => []),
      ),
    );
    const answers = pages.flat();
    const statuses: JSONObject = {};
    for (const mandate of answers) {
      if (!mandate) continue;
      statuses[mandate.id] = {
        live: mandate.isLive,
        expiresAt: mandate.expiresAt ?? null,
        revokedAt: mandate.revokedAt ?? null,
      };
    }
    return statuses;
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
const asLink = (invite: CollaborationLinkFragment, collaboration: string): JSONObject => ({
  id: invite.id,
  inviteUrl: invite.inviteUrl,
  expiresAt: invite.expiresAt ?? null,
  uses: invite.uses,
  maxUses: invite.maxUses ?? null,
  mesh: invite.mesh,
  valid: invite.valid,
  roles:
    invite.collaborations?.find((entry) => entry.collaboration === collaboration)?.roles ?? [],
});

/**
 * `lok.shareCollaboration`: a link (a collaboration invite) that grants one collaboration (by
 * its key, the same on every service of the organization) to whoever opens it and signs in,
 * with `roles` holding only inside it. Args `{ collaboration, roles?, expiresInDays? (null:
 * never), maxUses? (null: anyone), allowMesh? }`; answers the link, as `lok.collaborationLinks`
 * lists it.
 */
const shareCollaboration: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const collaboration = optionalString(args.collaboration);
    if (!collaboration) throw new Error("Which collaboration?");
    const result = await client.mutate<ShareCollaborationMutation, ShareCollaborationMutationVariables>({
      mutation: ShareCollaborationDocument,
      variables: {
        input: {
          collaborations: [{ collaboration, roles: stringList(args.roles) }],
          expiresInDays: args.expiresInDays === null ? null : optionalInt(args.expiresInDays),
          maxUses: optionalInt(args.maxUses) ?? null,
          allowMesh: args.allowMesh !== false,
        },
      },
    });
    const invite = result.data?.createInvite;
    if (!invite) throw new Error("lok did not make the link");
    return asLink(invite, collaboration);
  },
};

/**
 * `lok.collaborationLinks`: the links the signed-in user may see (their own, or all as an admin)
 * that grant one collaboration. Args `{ collaboration }` (its key); answers a list of links.
 */
const collaborationLinks: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const collaboration = optionalString(args.collaboration);
    if (!collaboration) throw new Error("Which collaboration?");
    const result = await client.query<CollaborationLinksQuery, CollaborationLinksQueryVariables>({
      query: CollaborationLinksDocument,
      variables: { collaboration },
      fetchPolicy: "network-only",
    });
    return result.data.invites.map((invite) => asLink(invite, collaboration));
  },
};

/** A collaboration as other modules read it (`core/collaborations`): its key names it everywhere. */
const asCollaboration = (collaboration: CollaborationFragment): JSONObject => ({
  id: collaboration.lokId,
  key: collaboration.key,
  name: collaboration.name,
  description: collaboration.description ?? null,
  createdAt: collaboration.createdAt,
});

/**
 * `lok.collaborations`: the active organization's collaborations (a guest: their own), newest
 * first as lok answers them. Args `{ search?, keys?, limit? }`; answers a list of
 * `{ id, key, name, description, createdAt }`.
 */
const collaborations: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const search = optionalString(args.search);
    const keys = stringList(args.keys);
    const result = await client.query<CollaborationsQuery, CollaborationsQueryVariables>({
      query: CollaborationsDocument,
      variables: {
        filters: search || keys.length ? { ...(search ? { search } : {}), ...(keys.length ? { keys } : {}) } : undefined,
        pagination: { offset: 0, limit: Math.min(optionalInt(args.limit) ?? SERVER_PAGE_CAP, SERVER_PAGE_CAP) },
      },
      fetchPolicy: "network-only",
    });
    return result.data.collaborations.map(asCollaboration);
  },
};

/**
 * `lok.createCollaboration`: a new, empty collaboration in the active organization. Args
 * `{ name, description? }`; answers it as `lok.collaborations` lists it. Services make their
 * row of it the first time something is put in it under its key.
 */
const createCollaboration: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const name = optionalString(typeof args.name === "string" ? args.name.trim() : undefined);
    if (!name) throw new Error("A collaboration needs a name");
    const result = await client.mutate<CreateCollaborationMutation, CreateCollaborationMutationVariables>({
      mutation: CreateCollaborationDocument,
      variables: { input: { name, description: optionalString(args.description) ?? null } },
      refetchQueries: [CollaborationsDocument],
    });
    const created = result.data?.createCollaboration;
    if (!created) throw new Error("lok did not create the collaboration");
    return asCollaboration(created);
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
    });
    return { id };
  },
};

/**
 * `lok.fileBugReport`: file a bug report from this app with the organization
 * the user is signed in to (the host's "Report a bug", `core/diagnostics`).
 * lok reads the client, its release and the organization off the token. Args
 * `{ description, title?, expected?, route?, appVersion?, platform?,
 * diagnostics?, screenshot? }`; answers `{ id }`.
 */
const fileBugReport: OperationHandler = {
  service: "lok",
  run: async (client, args: JSONObject) => {
    const description = optionalString(args.description);
    if (!description) throw new Error("A bug report needs a description");
    const result = await client.mutate<CreateBugReportMutation, CreateBugReportMutationVariables>({
      mutation: CreateBugReportDocument,
      variables: {
        input: {
          description,
          title: optionalString(args.title),
          expected: optionalString(args.expected),
          route: optionalString(args.route),
          appVersion: optionalString(args.appVersion),
          platform: optionalString(args.platform),
          diagnostics: args.diagnostics && typeof args.diagnostics === "object" ? args.diagnostics : undefined,
          screenshot: optionalString(args.screenshot),
        },
      },
      refetchQueries: [BugReportsDocument],
    });
    const id = result.data?.createBugReport.id;
    if (!id) throw new Error("lok did not take the report");
    return { id };
  },
};

export const LOK_OPERATIONS: Record<string, OperationHandler> = {
  "lok.fileBugReport": fileBugReport,
  "lok.shareCollaboration": shareCollaboration,
  "lok.collaborationLinks": collaborationLinks,
  "lok.collaborations": collaborations,
  "lok.createCollaboration": createCollaboration,
  "lok.revokeLink": revokeLink,
  "lok.createMandate": createMandate,
  "lok.revokeMandate": revokeMandate,
  "lok.mandateStatus": mandateStatus,
  "lok.isMemberOf": isMemberOf,
  "lok.requestMembership": requestMembership,
};
