import { gql } from '@/core/connection/graphql/lazyGql';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lok/api/hooks';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The App identifier is a unique identifier for an app. It is used to identify the app in the database and in the code. We encourage you to use the reverse domain name notation. E.g. `com.example.myapp` */
  AppIdentifier: { input: any; output: any; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /** The `Fakt` scalar type represents a reference to a fakt */
  Fakt: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  /** The Service identifier is a unique identifier for a service. It is used to identify the service in the database and in the code. We encourage you to use the reverse domain name notation. E.g. `com.example.myservice` */
  ServiceIdentifier: { input: any; output: any; }
  /** The `Version` represents a semver version string */
  Version: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

export type AcceptInviteInput = {
  token: Scalars['String']['input'];
};

export type AcknowledgeMessageInput = {
  acknowledged: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};

export type AddUserToOrganizationInput = {
  organization: Scalars['ID']['input'];
  roles: Array<Scalars['String']['input']>;
  user: Scalars['ID']['input'];
};

/** An App is the Arkitekt equivalent of a Software Application. It is a collection of `Releases` that can be all part of the same application. E.g the App `Napari` could have the releases `0.1.0` and `0.2.0`. */
export type App = {
  __typename?: 'App';
  id: Scalars['ID']['output'];
  /** The identifier of the app. This should be a globally unique string that identifies the app. We encourage you to use the reverse domain name notation. E.g. `com.example.myapp` */
  identifier: Scalars['AppIdentifier']['output'];
  /** The logo of the app. This should be a url to a logo that can be used to represent the app. */
  logo?: Maybe<MediaStore>;
  /** The name of the app */
  name: Scalars['String']['output'];
  /** How many releases the app has. */
  releaseCount: Scalars['Int']['output'];
  /** The releases of the app. A release is a version of the app that can be installed by a user. */
  releases: Array<Release>;
};


/** An App is the Arkitekt equivalent of a Software Application. It is a collection of `Releases` that can be all part of the same application. E.g the App `Napari` could have the releases `0.1.0` and `0.2.0`. */
export type AppReleasesArgs = {
  filters?: InputMaybe<ReleaseFilter>;
  ordering?: Array<ReleaseOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** App(id, name, identifier, organization, logo) */
export type AppFilter = {
  AND?: InputMaybe<AppFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AppFilter>;
  OR?: InputMaybe<AppFilter>;
  /** Only the apps with one of these identifiers (exact match). */
  identifiers?: InputMaybe<Array<Scalars['AppIdentifier']['input']>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type AppOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type ApproveMembershipRequestInput = {
  id: Scalars['ID']['input'];
  roles?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** A bug a person reported from inside a client, with what the client recorded around it. It belongs to the client it was filed from and remembers that client's release, so it can be read per client, release and app. Admins of the organization see all of them; a member sees their own. */
export type BugReport = {
  __typename?: 'BugReport';
  /** The app the report is about: the app of the release it was filed from. */
  app?: Maybe<App>;
  /** The version the client says it runs. */
  appVersion?: Maybe<Scalars['String']['output']>;
  /** The client the report was filed from. Null once that client is gone. */
  client?: Maybe<Client>;
  /** When it was filed. */
  createdAt: Scalars['DateTime']['output'];
  /** What happened, in the reporter's words. */
  description: Scalars['String']['output'];
  /** What the client recorded: recent errors, failed requests, steps, console. Its shape is the client's. */
  diagnostics: Scalars['JSON']['output'];
  /** What the reporter expected instead. */
  expected?: Maybe<Scalars['String']['output']>;
  /** When an admin passed it on to the app's issue tracker. */
  forwardedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The admin who passed it on. */
  forwardedBy?: Maybe<User>;
  /** The issue it became, when the admin recorded it. */
  forwardedUrl?: Maybe<Scalars['String']['output']>;
  /** Does the report carry a screenshot? */
  hasScreenshot: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** Has an admin closed this report? */
  isResolved: Scalars['Boolean']['output'];
  /** The operating system the client says it runs on. */
  platform?: Maybe<Scalars['String']['output']>;
  /** The release that client ran when the report was filed. */
  release?: Maybe<Release>;
  /** Who filed it. */
  reporter?: Maybe<User>;
  /** What the admin noted when closing it. */
  resolutionNote?: Maybe<Scalars['String']['output']>;
  /** When an admin closed it; null while it is open. */
  resolvedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The admin who closed it. */
  resolvedBy?: Maybe<User>;
  /** The page the reporter was on. */
  route?: Maybe<Scalars['String']['output']>;
  /** The screenshot as a data URL. Kept in the database and served only here, to those who may read the report: it can show the reporter's data, so it never goes to the public media bucket. Ask for it on one report, not on a list. */
  screenshot?: Maybe<Scalars['String']['output']>;
  /** The first line of what the reporter wrote. */
  title: Scalars['String']['output'];
};

/**
 * A bug a person reported from inside a client (Orkestrator's "Report a bug").
 *
 * Not a `Report`: that is a client's own configuration report. This is a user
 * saying something went wrong, with what the client recorded around it.
 *
 * It hangs on the client that filed it (taken from the token, never from the
 * payload), and remembers that client's release at the time, so an
 * organization can read its reports per client, per release and per app. The
 * release is kept separately because a client can be deleted or move on to a
 * newer release, and the report is about the version it was filed from.
 */
export type BugReportFilter = {
  AND?: InputMaybe<BugReportFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BugReportFilter>;
  OR?: InputMaybe<BugReportFilter>;
  /** Reports filed from any release of this app. */
  app?: InputMaybe<Scalars['ID']['input']>;
  /** Reports filed from this client. */
  client?: InputMaybe<Scalars['ID']['input']>;
  /** True: only reports already passed on to an issue tracker. False: only those that were not. */
  forwarded?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Reports filed from any client of this release. */
  release?: InputMaybe<Scalars['ID']['input']>;
  /** Reports this user filed. */
  reporter?: InputMaybe<Scalars['ID']['input']>;
  /** True: only resolved reports. False: only the ones still open. */
  resolved?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type BugReportOrdering =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export type CancelInviteInput = {
  id: Scalars['ID']['input'];
  /** For a collaboration invite: also take back the collaborations it granted from everyone who accepted it. */
  revokeShared?: Scalars['Boolean']['input'];
};

/**
 * A client is a way of authenticating users with a release.
 *  The strategy of authentication is defined by the kind of client. And allows for different authentication flow.
 *  E.g a client can be a DESKTOP app, that might be used by multiple users, or a WEBSITE that wants to connect to a user's account,
 *  but also a DEVELOPMENT client that is used by a developer to test the app. The client model thinly wraps the oauth2 client model, which is used to authenticate users.
 */
export type Client = {
  __typename?: 'Client';
  /** The id the services know this client by: the `client_id` claim of its tokens. It is the client's own OAuth2 client id until the client has run more than one release of its app, and from then on one per release, so that what it did as an earlier version stays that version's. A client can still be looked up by any id it has had. */
  clientId: Scalars['String']['output'];
  /** Is this client functional? A functional client is a client that is able to authenticate users. If a client is not functional, it will not be able to authenticate users. */
  functional: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** The issue url of the client. This is the url where users can report issues and get more information about the client. */
  issueUrl?: Maybe<Scalars['String']['output']>;
  /** What kind of principal this client is (its authentication strategy): DEVELOPMENT, WEBSITE, DESKTOP, MOBILE, HUB or RELYING_PARTY. */
  kind: ClientKind;
  /** The logo of the release. This should be a url to a logo that can be used to represent the release. */
  logo?: Maybe<MediaStore>;
  /** The mandate this client logs in with, if it logs in with a key. */
  mandate?: Maybe<Mandate>;
  /** The mappings of the client. A mapping is a mapping of a service to a service instance. This is used to configure the hub. */
  mappings: Array<ServiceInstanceMapping>;
  /** A human-readable label for the client that folds in the app, version, operator and device — e.g. `com.example.app:v0.1.1 by Johannes on my-laptop`. */
  name: Scalars['String']['output'];
  /** The node this runs on */
  node?: Maybe<Device>;
  /** Is this client public? A public client cannot keep a secret (desktop apps, mobile apps, SPAs, hub identities) and authenticates without one, relying on PKCE / device-code flows instead. */
  public: Scalars['Boolean']['output'];
  /** The public sources of the client. These are the public sources where users can find more information about the client. */
  publicSources: Array<PublicSource>;
  /** The release that this client belongs to. Null for clients that are not bound to an app release (hub identities, relying parties, pending registrations). */
  release?: Maybe<Release>;
  /** The operational role of the client. INTERFACE clients are human interfaces operated by a user in real time. AGENT clients are authorized once and then run unattended, receiving and processing tasks on the user's behalf. */
  role: ClientRole;
  /** The user this client acts for (derived from its membership). */
  user?: Maybe<User>;
};


/**
 * A client is a way of authenticating users with a release.
 *  The strategy of authentication is defined by the kind of client. And allows for different authentication flow.
 *  E.g a client can be a DESKTOP app, that might be used by multiple users, or a WEBSITE that wants to connect to a user's account,
 *  but also a DEVELOPMENT client that is used by a developer to test the app. The client model thinly wraps the oauth2 client model, which is used to authenticate users.
 */
export type ClientMappingsArgs = {
  ordering?: Array<ServiceInstanceMappingOrdering>;
};

/** A client looked up by an id another service knows it by (`clientsByClientId`). */
export type ClientByClientId = {
  __typename?: 'ClientByClientId';
  /** The client known by that id. */
  client: Client;
  /** The id that was asked for. The client's current `clientId` may differ: a client keeps one id per release it ran. */
  requestedId: Scalars['ID']['output'];
};

/**
 * The one client model: every OAuth2 principal is a row here.
 *
 * Kinds of rows and their lifecycle:
 *
 * - **App clients** (`development`/`website`/`desktop`/`mobile`): the row is created by
 *   dynamic registration at ``/o/app-authorization/`` with identity fields
 *   only; human approval *binds* it (membership, organization, release, hub,
 *   mappings, scope). ``membership`` null == not yet approved.
 * - **Hub identities** (`hub`): same lifecycle via ``/o/hub-authorization/``;
 *   the created ``Hub`` links back via ``Hub.client`` (reverse:
 *   ``client.hub_identity``).
 * - **Relying parties** (`relying_party`): confidential OIDC clients
 *   provisioned from config by ``ensureopenid``; global (no organization).
 *
 * Implements authlib's ``ClientMixin`` directly — there is no separate
 * OAuth2 client table anymore.
 */
export type ClientFilter = {
  AND?: InputMaybe<ClientFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ClientFilter>;
  OR?: InputMaybe<ClientFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  role?: InputMaybe<ClientRole>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export enum ClientKind {
  Desktop = 'DESKTOP',
  Development = 'DEVELOPMENT',
  Hub = 'HUB',
  Mobile = 'MOBILE',
  RelyingParty = 'RELYING_PARTY',
  Website = 'WEBSITE'
}

export type ClientOrdering =
  { createdAt: Ordering; id?: never; lastReportedAt?: never; name?: never; }
  |  { createdAt?: never; id: Ordering; lastReportedAt?: never; name?: never; }
  |  { createdAt?: never; id?: never; lastReportedAt: Ordering; name?: never; }
  |  { createdAt?: never; id?: never; lastReportedAt?: never; name: Ordering; };

export enum ClientRole {
  Agent = 'AGENT',
  Interface = 'INTERFACE'
}

/** What a guest of the organization is let in to: one key across all of its services, each of which holds what was put in it there (`addToCollaboration`, `shareWorkflow` with the key). lok names it and grants it (`createInvite(collaborations:)`); it never sees what is in it. */
export type Collaboration = {
  __typename?: 'Collaboration';
  createdAt: Scalars['DateTime']['output'];
  createdBy?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The key every service of the organization names the collaboration by. */
  key: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/**
 * What a guest of an organization is let in to: one key across all of its services.
 *
 * lok names it and grants it; what is in it, each service of the organization
 * holds itself (``arkitekt_service.collaborations``), under a row with the same
 * ``key``, made the first time something is put in there. lok never learns what
 * is in it: a guest's token lists the keys (``collabs``), and each service shows
 * what it put in them.
 */
export type CollaborationFilter = {
  AND?: InputMaybe<CollaborationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CollaborationFilter>;
  OR?: InputMaybe<CollaborationFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only these collaborations, by their key. */
  keys?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A communication channel through which a user can be notified (e.g. a push token). */
export type ComChannel = {
  __typename?: 'ComChannel';
  id: Scalars['ID']['output'];
  user: User;
};

/** __doc__ */
export type ComChannelFilter = {
  AND?: InputMaybe<ComChannelFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ComChannelFilter>;
  OR?: InputMaybe<ComChannelFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ComChannelOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type Context = {
  __typename?: 'Context';
  /** The brand chroma (0–1) in effect: the member's own choice for the organization, else the organization's default. Null when neither is set. */
  brandChroma?: Maybe<Scalars['Float']['output']>;
  /** The brand hue (0–360) in effect: the member's own choice for the organization, else the organization's default. Null when neither is set. */
  brandHue?: Maybe<Scalars['Float']['output']>;
  /** Are we acting in the active organization of the user? */
  fitsActiveOrganization: Scalars['Boolean']['output'];
  /** The hub this client was approved into (for an app client) or is the identity of (for a hub client). Null for clients bound to no hub, e.g. plain OIDC relying parties. Apps can pass its id back as `?hub=` on a later configure link to preselect it. */
  hub?: Maybe<Hub>;
  /** Is the user a member of this organization? False for an organization that does not exist, so it says nothing about other tenants. */
  memberOf: Scalars['Boolean']['output'];
  /** The user's membership in the organization, or null when they are not a member of it. */
  membership?: Maybe<Membership>;
  /** The organization that is associated with this app */
  organization: Organization;
  /** The roles that the user has in the organization */
  roles: Array<Scalars['String']['output']>;
  /** The scope of the app within in the organization */
  scope: Array<Scalars['String']['output']>;
  /** The user that is associated with this app */
  user: User;
};


export type ContextMemberOfArgs = {
  organization: Scalars['ID']['input'];
};

/** A bug report from inside a client. Which client, release and organization it belongs to is read from the token, not from here. */
export type CreateBugReportInput = {
  appVersion?: InputMaybe<Scalars['String']['input']>;
  /** What happened, in the reporter's words. */
  description: Scalars['String']['input'];
  /** What the client recorded. At most 512 KB as JSON. */
  diagnostics?: InputMaybe<Scalars['JSON']['input']>;
  expected?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<Scalars['String']['input']>;
  /** The page the reporter was on. */
  route?: InputMaybe<Scalars['String']['input']>;
  /** A data URL (JPEG, PNG or WebP) of at most 1 MB. */
  screenshot?: InputMaybe<Scalars['String']['input']>;
  /** A short name; the first line of the description when omitted. */
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateCollaborationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateGroupProfileInput = {
  avatar: Scalars['ID']['input'];
  group: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CreateInviteInput = {
  /** For a collaboration invite: whether the guests' apps may join the organization's mesh. They then reach only the organization's hubs, nothing else of the mesh. */
  allowMesh?: Scalars['Boolean']['input'];
  /** Grant only these collaborations of the organization, each with the roles that hold inside it, instead of making the holder a member. */
  collaborations?: InputMaybe<Array<SharedCollaborationInput>>;
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  /** For a collaboration invite: how many people may accept it. Null: anyone with the link until it expires. */
  maxUses?: InputMaybe<Scalars['Int']['input']>;
  organization?: InputMaybe<Scalars['ID']['input']>;
  roles?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Pre-authorize an agent app to issue mandate keys for a subject app, acting as you. */
export type CreateMandateInput = {
  /** Identifier of the app allowed to issue keys (e.g. a deployer). */
  agent: Scalars['String']['input'];
  /** Only an agent running on this device may issue. */
  agentDeviceId?: InputMaybe<Scalars['String']['input']>;
  /** Only an agent acting as this user may issue. */
  agentUser?: InputMaybe<Scalars['ID']['input']>;
  /** Whether a client logging in with a key issued under the mandate may ask for a mesh key. Every child key inherits it. */
  allowMesh?: Scalars['Boolean']['input'];
  /** Opaque binding for the approving service (e.g. a release digest). */
  attestation?: InputMaybe<Scalars['String']['input']>;
  /** The mandate (and every key issued under it) stops working after this many days (1–365). Null: as long as your app. */
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  /** The hub the subject composes against. Defaults to the calling client's hub. */
  hub?: InputMaybe<Scalars['ID']['input']>;
  /** The subject app. Its scopes and requirements are the ceiling for every key issued under it, and may not exceed your app's own; deviceId is ignored. */
  manifest: ManifestInput;
  /** How many live keys may exist under the mandate at once. */
  maxClients?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateOrganizationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateProfileInput = {
  name: Scalars['String']['input'];
  user: Scalars['ID']['input'];
};

export type CreateServiceInstanceInput = {
  allowedGroups?: InputMaybe<Array<Scalars['ID']['input']>>;
  allowedUsers?: InputMaybe<Array<Scalars['ID']['input']>>;
  deniedGroups?: InputMaybe<Array<Scalars['ID']['input']>>;
  deniedUsers?: InputMaybe<Array<Scalars['ID']['input']>>;
  identifier: Scalars['String']['input'];
  service: Scalars['ID']['input'];
};

export type DeclineInviteInput = {
  token: Scalars['String']['input'];
};

export type DeclineMembershipRequestInput = {
  id: Scalars['ID']['input'];
};

export type DeleteBugReportInput = {
  id: Scalars['ID']['input'];
};

export type DeleteCollaborationInput = {
  id: Scalars['ID']['input'];
};

/** Device(id, node_id, name, organization) */
export type Device = {
  __typename?: 'Device';
  /** How many clients run on this device. */
  clientCount: Scalars['Int']['output'];
  clients: Array<Client>;
  /** The device groups that belong to this device. */
  deviceGroups: Array<DeviceGroup>;
  /** The (per-organization hashed) id of the device. */
  deviceId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use deviceId. */
  nodeId: Scalars['ID']['output'];
};


/** Device(id, node_id, name, organization) */
export type DeviceClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  ordering?: Array<ClientOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Device(id, node_id, name, organization) */
export type DeviceDeviceGroupsArgs = {
  filters?: InputMaybe<DeviceGroupFilter>;
  ordering?: Array<DeviceGroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Device(id, node_id, name, organization) */
export type DeviceFilter = {
  AND?: InputMaybe<DeviceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DeviceFilter>;
  OR?: InputMaybe<DeviceFilter>;
  /** Only the devices in this device group. */
  deviceGroup?: InputMaybe<Scalars['ID']['input']>;
  /** Only the devices with one of these device ids: the ids the other services know a device by (`Device.deviceId`, a token's `client_device` claim), used as they are, never hashed again. */
  deviceIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A DeviceGroup is a group of compute nodes that can be used to run clients. DeviceGroups can be used to group compute nodes by location, hardware type, or any other criteria. */
export type DeviceGroup = {
  __typename?: 'DeviceGroup';
  /** The devices that belong to this device group. */
  devices: Array<Device>;
  id: Scalars['ID']['output'];
  /** The name of the device group. */
  name: Scalars['String']['output'];
};


/** A DeviceGroup is a group of compute nodes that can be used to run clients. DeviceGroups can be used to group compute nodes by location, hardware type, or any other criteria. */
export type DeviceGroupDevicesArgs = {
  filters?: InputMaybe<DeviceFilter>;
  ordering?: Array<DeviceOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** DeviceGroup(id, name, organization) */
export type DeviceGroupFilter = {
  AND?: InputMaybe<DeviceGroupFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DeviceGroupFilter>;
  OR?: InputMaybe<DeviceGroupFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type DeviceGroupOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type DeviceOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type ForwardBugReportInput = {
  /** False takes the mark back. */
  forwarded?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
  /** The issue the report became, when it is known. */
  url?: InputMaybe<Scalars['String']['input']>;
};

export enum Granularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Month = 'MONTH',
  Quarter = 'QUARTER',
  Week = 'WEEK',
  Year = 'YEAR'
}

/**
 *
 * A Group is the base unit of Role Based Access Control. A Group can have many users and many permissions. A user can have many groups. A user with a group that has a permission can perform the action that the permission allows.
 * Groups are propagated to the respecting subservices. Permissions are not. Each subservice has to define its own permissions and mappings to groups.
 *
 */
export type Group = {
  __typename?: 'Group';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  profile?: Maybe<GroupProfile>;
  /** The users that are in the group */
  users: Array<User>;
};

/** __doc__ */
export type GroupFilter = {
  AND?: InputMaybe<GroupFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<GroupFilter>;
  OR?: InputMaybe<GroupFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type GroupOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/**
 *
 * A Profile of a Group. A GroupProfile can be used to display information about a group,
 * such as a display name, a short bio and an avatar.
 *
 */
export type GroupProfile = {
  __typename?: 'GroupProfile';
  /** The avatar of the group */
  avatar?: Maybe<MediaStore>;
  /** A short bio of the group */
  bio?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The name of the group */
  name?: Maybe<Scalars['String']['output']>;
};

/** A Hub is a specific configuration of a Service. It contains the configuration for a particular version of the service. */
export type Hub = {
  __typename?: 'Hub';
  /** The description of the service. This should be a human readable description of the service. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The identifier of the hub. This should be a globally unique string that identifies the hub. We encourage you to use the reverse domain name notation. E.g. `com.example.myhub` */
  identifier: Scalars['ServiceIdentifier']['output'];
  /** Whether the hub's last health report said it was healthy. Null if it never reported. */
  lastHealthy?: Maybe<Scalars['Boolean']['output']>;
  /** When the hub last reported its health. Null if it never has. */
  lastSeenAt?: Maybe<Scalars['DateTime']['output']>;
  /** The hub's most recent health report, or null if it never reported. */
  latestHealth?: Maybe<HubHealthReport>;
  /** Whether the hub's last health report said its node is on the mesh. Null if it never reported mesh state. */
  meshConnected?: Maybe<Scalars['Boolean']['output']>;
  /** The hub node's MagicDNS name (or mesh IP), as last reported by the hub. Empty when unknown or off the mesh. */
  meshHost: Scalars['String']['output'];
  /** The name of the hub. This should be a human readable name of the hub. */
  name: Scalars['String']['output'];
  /** When the hub stops counting as online unless it reports again: its last report plus three reporting intervals. Null if it never reported. A client watching `hubHealth` sets a timer for it instead of polling. */
  offlineAt?: Maybe<Scalars['DateTime']['output']>;
  /** Whether the hub reported its health within the last three reporting intervals. */
  online: Scalars['Boolean']['output'];
  /** The organization that this hub belongs to. */
  organization: Organization;
  /** The hub software version, as last reported (empty if never reported). */
  version: Scalars['String']['output'];
};

/** Hub(id, name, organization, identifier, description, creator, client, token, uid, auth_key, tls_certificate, last_seen_at, last_healthy, version, mesh_connected, mesh_host) */
export type HubFilter = {
  AND?: InputMaybe<HubFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<HubFilter>;
  OR?: InputMaybe<HubFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** One health report a hub posted to lok. */
export type HubHealthReport = {
  __typename?: 'HubHealthReport';
  /** When the hub reported. */
  createdAt: Scalars['DateTime']['output'];
  /** Did the hub report itself healthy? */
  healthy: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** The per-instance health in this report. Only instances of the hub are listed. */
  instances: Array<InstanceHealth>;
};

export type HubOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/** An alias for a service instance. This is used to provide a more user-friendly name for the instance. */
export type InstanceAlias = {
  __typename?: 'InstanceAlias';
  /** The challenge of the alias. This is used to verify that the alias is reachable. If set, the alias will be accessed via the challenge URL (e.g. 'example.com/.well-known/challenge'). If not set, the alias will be accessed via the instance's URL. */
  challenge: Scalars['String']['output'];
  /** The host of the alias (e.g. 'example.com'). Not set for a mesh alias, which resolves to its hub node's MagicDNS name. */
  host?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The instance that this alias belongs to. */
  instance: ServiceInstance;
  /** The kind of alias. If absolute, it is a full URL; if mesh, it resolves to its hub node on the organization's mesh; if docker, it is only reachable from inside the hub's own docker environment. */
  kind: Scalars['String']['output'];
  /** The layer that this alias belongs to, if any. */
  layer?: Maybe<Layer>;
  /** The path of the alias (e.g. 'path' for 'example.com/path'). */
  path?: Maybe<Scalars['String']['output']>;
  /** The port of the alias (e.g. 8080 for 'example.com:8080'). If not set, the scheme's default port is used. */
  port?: Maybe<Scalars['Int']['output']>;
  /** Is this alias publicly reachable? If true, the coordination server can also check the alias's health directly, enabling health checks from the kontrol interface. */
  public: Scalars['Boolean']['output'];
  /** Is this alias using SSL? If true, the alias will be accessed via https:// instead of http://. This is used to indicate that the alias is secure and should be accessed via SSL */
  ssl: Scalars['Boolean']['output'];
};

export type InstanceAliasOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/** The health a hub reported for one of its service instances. */
export type InstanceHealth = {
  __typename?: 'InstanceHealth';
  /** Did the hub report the instance healthy? */
  healthy: Scalars['Boolean']['output'];
  /** The service instance this entry is about. */
  instance: ServiceInstance;
  /** Why the instance is unhealthy, if the hub said. */
  reason?: Maybe<Scalars['String']['output']>;
};

/** A single-use magic invite link that allows one person to join an organization. */
export type Invite = {
  __typename?: 'Invite';
  acceptedBy?: Maybe<User>;
  /** The collaborations this invite grants, with the roles that hold inside each. Null for an invite that makes its holder a member. */
  collaborations?: Maybe<Array<SharedCollaboration>>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  createdFor: Organization;
  createdMemberships: Array<Membership>;
  declinedBy?: Maybe<User>;
  email?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** Get the full URL for accepting this invite */
  inviteUrl: Scalars['String']['output'];
  /** For a collaboration invite: how many people may accept it. Null: anyone with the link until it expires. */
  maxUses?: Maybe<Scalars['Int']['output']>;
  /** For a collaboration invite: whether its guests' apps may join the organization's mesh, reaching only its hubs. */
  mesh: Scalars['Boolean']['output'];
  /** Whether anyone with the link can preview the invitation before signing in. */
  public: Scalars['Boolean']['output'];
  respondedAt?: Maybe<Scalars['DateTime']['output']>;
  roles: Array<Role>;
  status: Scalars['String']['output'];
  token: Scalars['String']['output'];
  /** How many people accepted it so far. */
  uses: Scalars['Int']['output'];
  /** Check if the invite is still valid and pending */
  valid: Scalars['Boolean']['output'];
};


/** A single-use magic invite link that allows one person to join an organization. */
export type InviteCreatedMembershipsArgs = {
  filters?: InputMaybe<MembershipFilter>;
  ordering?: Array<MembershipOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A single-use magic invite link that allows one person to join an organization. */
export type InviteRolesArgs = {
  filters?: InputMaybe<RoleFilter>;
  ordering?: Array<RoleOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Invite(id, token, email, created_by, created_for, created_at, expires_at, public, status, accepted_by, declined_by, responded_at, shared_collaborations, max_uses, uses, mesh) */
export type InviteFilter = {
  AND?: InputMaybe<InviteFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<InviteFilter>;
  OR?: InputMaybe<InviteFilter>;
  /** Only the invites granting this collaboration (its key). */
  collaboration?: InputMaybe<Scalars['ID']['input']>;
  /** Only the links that grant collaborations (true), or only the invites to become a member (false). */
  grantsCollaborations?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  /** Only the invites that can still be accepted (true: pending and not expired), or only the others (false). */
  valid?: InputMaybe<Scalars['Boolean']['input']>;
};

export type InviteOrdering =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

/** Issue a mandate key for one instance of a mandate's subject (called by the mandate's agent). */
export type IssueChildMandateKeyInput = {
  /** Unique per instance: one key logs in one client per device. */
  deviceId: Scalars['String']['input'];
  /** The key stops working after this many days. Null: as long as the mandate. */
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  mandate: Scalars['ID']['input'];
};

/** Issue a mandate key for an app, acting as you. It is capped at your app's own scopes and dies with your app. */
export type IssueMandateKeyInput = {
  /** Whether a client logging in with the key may ask for a mesh key. */
  allowMesh?: Scalars['Boolean']['input'];
  /** Let every release of the app log in with the key, not only the manifest's version. */
  anyVersion?: Scalars['Boolean']['input'];
  /** The key stops working after this many days (1–30). */
  expiresInDays: Scalars['Int']['input'];
  /** The hub the app composes against. Defaults to the calling client's hub. */
  hub?: InputMaybe<Scalars['ID']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  /** The app the key logs in. Identifier, version and deviceId (when given) must match exactly; scopes and requirements are a ceiling. */
  manifest: ManifestInput;
  /** On how many devices the key may log in. Null: unlimited. */
  maxClients?: InputMaybe<Scalars['Int']['input']>;
};

/** A freshly issued mandate and its key. The key is shown only here, once. */
export type IssuedMandateKey = {
  __typename?: 'IssuedMandateKey';
  /** The mandate key. Hand it to the app as FAKTS_MANDATE_KEY; lok keeps only its hash. */
  key: Scalars['String']['output'];
  mandate: Mandate;
};

/** A Layer is a network through which service instances can be reached (e.g. the public web, a tailnet, a VPN, or a docker network). Instance aliases are resolved relative to the layer they belong to. */
export type Layer = {
  __typename?: 'Layer';
  /** The description of the layer. This should be a human readable description of the layer. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The identifier of the layer. This should be a globally unique string that identifies the layer. We encourage you to use the reverse domain name notation. E.g. `com.example.mylayer` */
  identifier: Scalars['ServiceIdentifier']['output'];
  /** The logo of the layer. This should be a url to a logo that can be used to represent the layer. */
  logo?: Maybe<MediaStore>;
  /** The name of the layer */
  name: Scalars['String']['output'];
};

/** Layer(id, name, identifier, organization, logo, description, dns_probe, get_probe, kind) */
export type LayerFilter = {
  AND?: InputMaybe<LayerFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<LayerFilter>;
  OR?: InputMaybe<LayerFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type LayerOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type LinkingRequestInput = {
  host: Scalars['String']['input'];
  isSecure?: Scalars['Boolean']['input'];
  port: Scalars['String']['input'];
};

/** A standing authority to act as the grantor, inside one hub, up to a pinned app. Whoever holds its key logs in as the grantor (a keyed mandate), or the agent app it names may issue keyed mandates under it (an agent mandate). It dies with whoever issued it. */
export type Mandate = {
  __typename?: 'Mandate';
  /** If set, only an agent running on this device may issue. */
  agentDevice?: Maybe<Device>;
  /** The app allowed to issue keys under this mandate. Null for a keyed mandate. */
  agentIdentifier?: Maybe<Scalars['String']['output']>;
  /** If set, only an agent acting as this user may issue. */
  agentUser?: Maybe<User>;
  /** Whether a client logging in with the key may ask for a mesh key. */
  allowMesh: Scalars['Boolean']['output'];
  /** Opaque binding set by the approving service (e.g. a release digest). */
  attestation: Scalars['String']['output'];
  /** The keyed mandates the agent issued under this one. */
  children: Array<Mandate>;
  /** Who may use the mandate. */
  claimant: MandateClaimant;
  /** How many clients are logged in with the key. */
  clientCount: Scalars['Int']['output'];
  /** The clients logged in with the key, one per device. */
  clients: Array<Client>;
  createdAt: Scalars['DateTime']['output'];
  /** After this the mandate no longer works. Null: as long as its issuer. */
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  /** The user the clients act as. */
  grantor: User;
  /** The hub the clients compose against. */
  hub: Hub;
  id: Scalars['ID']['output'];
  /** Whether the mandate still works. */
  isLive: Scalars['Boolean']['output'];
  /** The app that issued this mandate. */
  issuingClient?: Maybe<Client>;
  /** The first characters of the key, to recognise it by. Empty for an agent mandate. */
  keyPrefix: Scalars['String']['output'];
  /** A human name for the mandate. */
  label: Scalars['String']['output'];
  /** When the key was last exchanged for a token. */
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Keyed: on how many devices the key may log in. Agent: how many live keys may be issued under it. Null means unlimited. */
  maxClients?: Maybe<Scalars['Int']['output']>;
  /** Who issued the mandate. */
  origin: MandateOrigin;
  /** The agent mandate this one was issued under. */
  parent?: Maybe<Mandate>;
  /** Why the mandate was withdrawn. */
  revocationReason?: Maybe<MandateRevocation>;
  /** When the mandate was withdrawn; its clients were deleted then. */
  revokedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The app the mandate admits, and the ceilings it puts on it. */
  subject: MandatePin;
};


/** A standing authority to act as the grantor, inside one hub, up to a pinned app. Whoever holds its key logs in as the grantor (a keyed mandate), or the agent app it names may issue keyed mandates under it (an agent mandate). It dies with whoever issued it. */
export type MandateChildrenArgs = {
  filters?: InputMaybe<MandateFilter>;
  ordering?: Array<MandateOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A standing authority to act as the grantor, inside one hub, up to a pinned app. Whoever holds its key logs in as the grantor (a keyed mandate), or the agent app it names may issue keyed mandates under it (an agent mandate). It dies with whoever issued it. */
export type MandateClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  ordering?: Array<ClientOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Who may use a mandate. */
export enum MandateClaimant {
  Agent = 'AGENT',
  Key = 'KEY'
}

/**
 * A standing authority to act as the grantor, inside one hub, up to a pinned manifest.
 *
 * Every headless login goes through one. Who may use it is the *claimant*:
 *
 * - ``key``: whoever holds the mandate key exchanges it at the token endpoint
 *   (``urn:fakts:grant-type:mandate-key``) for an access token of a client acting as
 *   the grantor. Only the key's SHA-256 is stored. There is no refresh chain: the
 *   client runs the grant again when its access token expires, and every grant
 *   re-checks the mandate.
 * - ``agent``: the app named by ``agent_identifier`` (a deployer) may issue keyed
 *   child mandates under it, one per instance it runs. kabinet's release approvals
 *   are agent mandates.
 *
 * Who issued it is the *origin*, and a mandate dies with its issuer: the grantor
 * membership, the issuing client (``issuing_client``), the parent agent mandate
 * (``parent``), the hub that asked for it, or the deployment config entry
 * (``config_name``) that names it. Deletions cascade; revocations are pushed down
 * to every child by ``fakts.services.mandates.revoke_mandate``.
 */
export type MandateFilter = {
  AND?: InputMaybe<MandateFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MandateFilter>;
  OR?: InputMaybe<MandateFilter>;
  /** Only the agent mandates this app (by identifier) may issue keys under. */
  agentIdentifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
  /** Only the mandates whose clients may (true) or may not (false) ask for a mesh key. */
  allowMesh?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only the mandates this claimant may use: KEY (keyed) or AGENT (an agent app issues keys under it). */
  claimant?: InputMaybe<MandateClaimant>;
  /** Only the mandates issued under a parent agent mandate (true), or only the top-level ones (false). */
  hasParent?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  live?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  /** Only the mandates admitting this app (by identifier, exact). */
  subjectIdentifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
};

export type MandateOrdering =
  { createdAt: Ordering; id?: never; lastUsedAt?: never; }
  |  { createdAt?: never; id: Ordering; lastUsedAt?: never; }
  |  { createdAt?: never; id?: never; lastUsedAt: Ordering; };

/** Who issued a mandate. A mandate dies with its issuer. */
export enum MandateOrigin {
  Agent = 'AGENT',
  Client = 'CLIENT',
  Config = 'CONFIG',
  Hub = 'HUB',
  Member = 'MEMBER'
}

/** The ceiling a mandate puts on the apps that log in under it. A null field is open. */
export type MandatePin = {
  __typename?: 'MandatePin';
  /** The device. Null: any device. */
  deviceId?: Maybe<Scalars['String']['output']>;
  /** The app. Null: fixed by the first app that logs in. */
  identifier?: Maybe<Scalars['String']['output']>;
  /** The most requirements an app may ask for. Null: any. */
  requirements?: Maybe<Array<RequirementPin>>;
  /** The most scopes an app may ask for. Null: the organization's. */
  scopes?: Maybe<Array<Scalars['String']['output']>>;
  /** The release. Null: every release. */
  version?: Maybe<Scalars['String']['output']>;
};

/** Why a mandate stopped working. */
export enum MandateRevocation {
  IssuerRevoked = 'ISSUER_REVOKED',
  OrganizationRevoked = 'ORGANIZATION_REVOKED',
  ParentRevoked = 'PARENT_REVOKED',
  RemovedFromConfig = 'REMOVED_FROM_CONFIG',
  Revoked = 'REVOKED',
  Superseded = 'SUPERSEDED'
}

export type ManifestInput = {
  authors?: Array<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  deviceId?: InputMaybe<Scalars['String']['input']>;
  homepage?: InputMaybe<Scalars['String']['input']>;
  identifier: Scalars['String']['input'];
  keywords?: Array<Scalars['String']['input']>;
  license?: InputMaybe<Scalars['String']['input']>;
  logo?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated Use deviceId. */
  nodeId?: InputMaybe<Scalars['String']['input']>;
  publicSources?: InputMaybe<Array<PublicSourceInput>>;
  repoUrl?: InputMaybe<Scalars['String']['input']>;
  requirements?: Array<RequirementInput>;
  scopes?: Array<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  version: Scalars['String']['input'];
};

/**
 * Small helper around S3-backed stored objects.
 *
 * Provides convenience helpers for generating presigned URLs and
 * uploading content.
 */
export type MediaStore = {
  __typename?: 'MediaStore';
  bucket: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  /** The stodre of the image */
  path?: Maybe<Scalars['String']['output']>;
  presignedUrl: Scalars['String']['output'];
};


/**
 * Small helper around S3-backed stored objects.
 *
 * Provides convenience helpers for generating presigned URLs and
 * uploading content.
 */
export type MediaStorePresignedUrlArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};

/**
 *
 * A Membership is a relation between a User and an Organization. It can have multiple Roles assigned to it.
 *
 */
export type Membership = {
  __typename?: 'Membership';
  /** The member's personal brand chroma (0–1) for this organization, if set. Null means they have not overridden the organization's default — fall back to `organization.brandChroma`. */
  brandChroma?: Maybe<Scalars['Float']['output']>;
  /** The member's personal brand hue (0–360) for this organization, if set. Null means they have not overridden the organization's default — fall back to `organization.brandHue`. */
  brandHue?: Maybe<Scalars['Float']['output']>;
  /** When the user became a member. Null for an old membership whose invite or request did not tell. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  organization: Organization;
  /** The roles that the user has in the organization */
  roles: Array<Role>;
  user: User;
};


/**
 *
 * A Membership is a relation between a User and an Organization. It can have multiple Roles assigned to it.
 *
 */
export type MembershipRolesArgs = {
  filters?: InputMaybe<RoleFilter>;
  ordering?: Array<RoleOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Numeric/aggregatable fields of Membership */
export enum MembershipField {
  CreatedAt = 'CREATED_AT'
}

/** __doc__ */
export type MembershipFilter = {
  AND?: InputMaybe<MembershipFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MembershipFilter>;
  OR?: InputMaybe<MembershipFilter>;
  /** Only the memberships made at or after this time. A membership whose creation time is unknown (older than the record) never matches. */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Only the memberships made before this time. A membership whose creation time is unknown never matches. */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only the organization's admins (true) or only the others (false). */
  isAdmin?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only the memberships holding this role. */
  role?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type MembershipOrdering =
  { createdAt: Ordering; id?: never; username?: never; }
  |  { createdAt?: never; id: Ordering; username?: never; }
  |  /** By the member's username. */
  { createdAt?: never; id?: never; username: Ordering; };

/** A request of a user who is not a member of an organization to become one. */
export type MembershipRequest = {
  __typename?: 'MembershipRequest';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Optional note from the user explaining the request. */
  reason?: Maybe<Scalars['String']['output']>;
  resolvedBy?: Maybe<User>;
  respondedAt?: Maybe<Scalars['DateTime']['output']>;
  /** `pending`, `approved` or `declined` (filter with `MembershipRequestStatus`). */
  status: Scalars['String']['output'];
  /** The user who asks to join. Not a member yet, so they are visible here and nowhere else. */
  user: User;
};

/** A membership request into the active organization was made or answered. Exactly one field is set. */
export type MembershipRequestEvent = {
  __typename?: 'MembershipRequestEvent';
  /** A new request. */
  create?: Maybe<MembershipRequest>;
  /** A request that was answered. */
  update?: Maybe<MembershipRequest>;
};

/** __doc__ */
export type MembershipRequestFilter = {
  AND?: InputMaybe<MembershipRequestFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MembershipRequestFilter>;
  OR?: InputMaybe<MembershipRequestFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Matches the requester's username or their reason. */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Only the requests in one of these states. */
  status?: InputMaybe<Array<MembershipRequestStatus>>;
};

export type MembershipRequestOrdering =
  { createdAt: Ordering; id?: never; respondedAt?: never; }
  |  { createdAt?: never; id: Ordering; respondedAt?: never; }
  |  { createdAt?: never; id?: never; respondedAt: Ordering; };

/** Where a membership request stands. */
export enum MembershipRequestStatus {
  Approved = 'APPROVED',
  Declined = 'DECLINED',
  Pending = 'PENDING'
}

export type MembershipStats = {
  __typename?: 'MembershipStats';
  /** Average */
  avg?: Maybe<Scalars['Float']['output']>;
  /** Total number of items in the selection */
  count: Scalars['Int']['output'];
  /** Number of distinct values for the field */
  distinctCount: Scalars['Int']['output'];
  /** Maximum */
  max?: Maybe<Scalars['Float']['output']>;
  /** Minimum */
  min?: Maybe<Scalars['Float']['output']>;
  /** Time-bucketed stats over a datetime field. */
  series: Array<TimeBucket>;
  /** Sum */
  sum?: Maybe<Scalars['Float']['output']>;
};


export type MembershipStatsAvgArgs = {
  field: MembershipField;
};


export type MembershipStatsDistinctCountArgs = {
  field: MembershipField;
};


export type MembershipStatsMaxArgs = {
  field: MembershipField;
};


export type MembershipStatsMinArgs = {
  field: MembershipField;
};


export type MembershipStatsSeriesArgs = {
  by: Granularity;
  field: MembershipField;
  timestampField: MembershipTimestampField;
};


export type MembershipStatsSumArgs = {
  field: MembershipField;
};

/** Datetime fields of Membership for bucketing */
export enum MembershipTimestampField {
  CreatedAt = 'CREATED_AT'
}

export type Mutation = {
  __typename?: 'Mutation';
  acceptInvite: Membership;
  acknowledgeMessage: SystemMessage;
  addUserToOrganization: Membership;
  approveMembershipRequest: Membership;
  cancelInvite: Invite;
  createBugReport: BugReport;
  createCollaboration: Collaboration;
  createGroupProfile: GroupProfile;
  createInvite: Invite;
  createMandate: Mandate;
  createOrganization: Organization;
  createProfile: Profile;
  createServiceInstance: ServiceInstance;
  declineInvite: Invite;
  declineMembershipRequest: MembershipRequest;
  deleteBugReport: Scalars['ID']['output'];
  /** Delete a collaboration, and every grant of it. */
  deleteCollaboration: Scalars['ID']['output'];
  forwardBugReport: BugReport;
  issueChildMandateKey: IssuedMandateKey;
  issueMandateKey: IssuedMandateKey;
  notifyUser: Scalars['Boolean']['output'];
  registerComChannel: ComChannel;
  render: Scalars['Fakt']['output'];
  requestMediaUpload: PresignedPostCredentials;
  requestMembership: Scalars['Boolean']['output'];
  resolveBugReport: BugReport;
  revokeMandate: Mandate;
  unresolveBugReport: BugReport;
  updateCollaboration: Collaboration;
  updateDevice: Device;
  updateGroupProfile: GroupProfile;
  updateMembershipColors: Membership;
  updateOrganization: Organization;
  updateProfile: Profile;
  updateServiceInstance: ServiceInstance;
};


export type MutationAcceptInviteArgs = {
  input: AcceptInviteInput;
};


export type MutationAcknowledgeMessageArgs = {
  input: AcknowledgeMessageInput;
};


export type MutationAddUserToOrganizationArgs = {
  input: AddUserToOrganizationInput;
};


export type MutationApproveMembershipRequestArgs = {
  input: ApproveMembershipRequestInput;
};


export type MutationCancelInviteArgs = {
  input: CancelInviteInput;
};


export type MutationCreateBugReportArgs = {
  input: CreateBugReportInput;
};


export type MutationCreateCollaborationArgs = {
  input: CreateCollaborationInput;
};


export type MutationCreateGroupProfileArgs = {
  input: CreateGroupProfileInput;
};


export type MutationCreateInviteArgs = {
  input: CreateInviteInput;
};


export type MutationCreateMandateArgs = {
  input: CreateMandateInput;
};


export type MutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


export type MutationCreateProfileArgs = {
  input: CreateProfileInput;
};


export type MutationCreateServiceInstanceArgs = {
  input: CreateServiceInstanceInput;
};


export type MutationDeclineInviteArgs = {
  input: DeclineInviteInput;
};


export type MutationDeclineMembershipRequestArgs = {
  input: DeclineMembershipRequestInput;
};


export type MutationDeleteBugReportArgs = {
  input: DeleteBugReportInput;
};


export type MutationDeleteCollaborationArgs = {
  input: DeleteCollaborationInput;
};


export type MutationForwardBugReportArgs = {
  input: ForwardBugReportInput;
};


export type MutationIssueChildMandateKeyArgs = {
  input: IssueChildMandateKeyInput;
};


export type MutationIssueMandateKeyArgs = {
  input: IssueMandateKeyInput;
};


export type MutationNotifyUserArgs = {
  input: NotifyUserInput;
};


export type MutationRegisterComChannelArgs = {
  input: RegisterComChannelInput;
};


export type MutationRenderArgs = {
  input: RenderInput;
};


export type MutationRequestMediaUploadArgs = {
  input: RequestMediaUploadInput;
};


export type MutationRequestMembershipArgs = {
  input: RequestMembershipInput;
};


export type MutationResolveBugReportArgs = {
  input: ResolveBugReportInput;
};


export type MutationRevokeMandateArgs = {
  input: RevokeMandateInput;
};


export type MutationUnresolveBugReportArgs = {
  input: UnresolveBugReportInput;
};


export type MutationUpdateCollaborationArgs = {
  input: UpdateCollaborationInput;
};


export type MutationUpdateDeviceArgs = {
  input: UpdateDeviceInput;
};


export type MutationUpdateGroupProfileArgs = {
  input: UpdateGroupProfileInput;
};


export type MutationUpdateMembershipColorsArgs = {
  input: UpdateMembershipColorsInput;
};


export type MutationUpdateOrganizationArgs = {
  input: UpdateOrganizationInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateServiceInstanceArgs = {
  input: UpdateServiceInstanceInput;
};

export type NotifyUserInput = {
  message: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['ID']['input'];
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

export enum Ordering {
  Asc = 'ASC',
  AscNullsFirst = 'ASC_NULLS_FIRST',
  AscNullsLast = 'ASC_NULLS_LAST',
  Desc = 'DESC',
  DescNullsFirst = 'DESC_NULLS_FIRST',
  DescNullsLast = 'DESC_NULLS_LAST'
}

/** An Organization is a group of users that can work together on a project. */
export type Organization = {
  __typename?: 'Organization';
  /** The users that are currently active in the organization */
  activeUsers: Array<User>;
  /** The logo of the organization. Mirrors `profile.avatar`; prefer that field. */
  avatar?: Maybe<MediaStore>;
  /** The organization's default brand chroma (0–1), if set. Members can override it per-membership. */
  brandChroma?: Maybe<Scalars['Float']['output']>;
  /** The organization's default brand hue (0–360), if set. Members can override it per-membership. */
  brandHue?: Maybe<Scalars['Float']['output']>;
  /** A short description of the organization */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** the invites for this organization */
  invites: Array<Invite>;
  /** Requests of non-members to join this organization. Only its owner and admins see any. */
  membershipRequests: Array<MembershipRequest>;
  /** the memberships of people */
  memberships: Array<Membership>;
  /** The name of this organization */
  name: Scalars['String']['output'];
  profile: OrganizationProfile;
  /** The roles that are available in the organization */
  roles: Array<Role>;
  slug: Scalars['String']['output'];
  /** The users that are part of the organization. Only yourself for a guest who was only granted some collaborations. */
  users: Array<User>;
};


/** An Organization is a group of users that can work together on a project. */
export type OrganizationActiveUsersArgs = {
  filters?: InputMaybe<UserFilter>;
  ordering?: Array<UserOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** An Organization is a group of users that can work together on a project. */
export type OrganizationInvitesArgs = {
  filters?: InputMaybe<InviteFilter>;
  ordering?: Array<InviteOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** An Organization is a group of users that can work together on a project. */
export type OrganizationMembershipRequestsArgs = {
  filters?: InputMaybe<MembershipRequestFilter>;
  ordering?: Array<MembershipRequestOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** An Organization is a group of users that can work together on a project. */
export type OrganizationMembershipsArgs = {
  filters?: InputMaybe<MembershipFilter>;
  ordering?: Array<MembershipOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** __doc__ */
export type OrganizationFilter = {
  AND?: InputMaybe<OrganizationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<OrganizationFilter>;
  OR?: InputMaybe<OrganizationFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type OrganizationOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/**
 *
 * A Profile of an Organization. An OrganizationProfile can be used to display public information
 * about an organization, such as a display name, a short bio and an avatar (logo).
 *
 */
export type OrganizationProfile = {
  __typename?: 'OrganizationProfile';
  /** The avatar (logo) of the organization */
  avatar?: Maybe<MediaStore>;
  /** A short bio of the organization */
  bio?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The display name of the organization */
  name?: Maybe<Scalars['String']['output']>;
};

/** Temporary Credentials for a file upload that can be used by a Client (e.g. in a python datalayer) */
export type PresignedPostCredentials = {
  __typename?: 'PresignedPostCredentials';
  bucket: Scalars['String']['output'];
  /** The Content-Type the upload form must send; the policy pins it exactly. */
  contentType: Scalars['String']['output'];
  datalayer: Scalars['String']['output'];
  key: Scalars['String']['output'];
  policy: Scalars['String']['output'];
  store: Scalars['String']['output'];
  xAmzAlgorithm: Scalars['String']['output'];
  xAmzCredential: Scalars['String']['output'];
  xAmzDate: Scalars['String']['output'];
  xAmzSignature: Scalars['String']['output'];
};

/**
 *
 * A Profile of a User. A Profile can be used to display personalised information about a user,
 * such as a display name, a short bio and an avatar.
 *
 */
export type Profile = {
  __typename?: 'Profile';
  /** The avatar of the user */
  avatar?: Maybe<MediaStore>;
  /** A short bio of the user */
  bio?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The name of the user */
  name?: Maybe<Scalars['String']['output']>;
};

export type PublicSource = {
  __typename?: 'PublicSource';
  /** The kind of the public source. E.g. 'github' */
  kind: Scalars['String']['output'];
  /** The url of the public source */
  url: Scalars['String']['output'];
};

export type PublicSourceInput = {
  kind: PublicSourceKind;
  url: Scalars['String']['input'];
};

export enum PublicSourceKind {
  Github = 'GITHUB',
  Website = 'WEBSITE'
}

export type Query = {
  __typename?: 'Query';
  _service: _Service;
  app: App;
  apps: Array<App>;
  bugReport: BugReport;
  /** Bugs people reported from inside a client. Every report of the organization for its admins, your own otherwise. Filter by client, release or app. */
  bugReports: Array<BugReport>;
  client: Client;
  clients: Array<Client>;
  /** The clients of the organization other services know by these ids (a token's `client_id` claim), in one query. */
  clientsByClientId: Array<ClientByClientId>;
  collaboration: Collaboration;
  /** The active organization's collaborations (a guest: theirs). */
  collaborations: Array<Collaboration>;
  device: Device;
  /** Look a device up by its device id: the id the other services know it by (`Device.deviceId`, a token's `client_device` claim, rekuest's `Agent.device.deviceId`). The raw id a client reports about itself is accepted too. */
  deviceByDeviceId: Device;
  deviceGroup: DeviceGroup;
  deviceGroups: Array<DeviceGroup>;
  devices: Array<Device>;
  group: Group;
  groups: Array<Group>;
  hallo: Scalars['String']['output'];
  /** A hub of the caller's organization, including its last reported health. The caller's own hub is also reachable as `mycontext { hub }`. */
  hub: Hub;
  hubs: Array<Hub>;
  invites: Array<Invite>;
  layer: Layer;
  layers: Array<Layer>;
  mandate: Mandate;
  /** Mandates you granted, your app issued, or (as an agent app) you may issue under or did. Org admins see all. */
  mandates: Array<Mandate>;
  me: User;
  /** Requests of non-members to join the active organization. Only its owner and admins see any. */
  membershipRequests: Array<MembershipRequest>;
  /** Counts over the memberships of the active organization, e.g. per role with `filters: { role }`. */
  membershipStats: MembershipStats;
  message: SystemMessage;
  myActiveMessages: Array<SystemMessage>;
  myManagedClients: Array<Client>;
  mycontext: Context;
  mygroups: Array<Group>;
  organization: Organization;
  organizations: Array<Organization>;
  release: Release;
  releases: Array<Release>;
  role: Role;
  roles: Array<Role>;
  scopes: Array<Scope>;
  service: Service;
  serviceInstance: ServiceInstance;
  serviceInstances: Array<ServiceInstance>;
  serviceRelease: ServiceRelease;
  serviceReleases: Array<ServiceRelease>;
  services: Array<Service>;
  user: User;
  userStats: UserStats;
  users: Array<User>;
};


export type QueryAppArgs = {
  clientId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  identifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
};


export type QueryAppsArgs = {
  filters?: InputMaybe<AppFilter>;
  ordering?: Array<AppOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryBugReportArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBugReportsArgs = {
  filters?: InputMaybe<BugReportFilter>;
  ordering?: Array<BugReportOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryClientArgs = {
  clientId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  ordering?: Array<ClientOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryClientsByClientIdArgs = {
  clientIds: Array<Scalars['ID']['input']>;
};


export type QueryCollaborationArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  key?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryCollaborationsArgs = {
  filters?: InputMaybe<CollaborationFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDeviceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDeviceByDeviceIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDeviceGroupArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDeviceGroupsArgs = {
  filters?: InputMaybe<DeviceGroupFilter>;
  ordering?: Array<DeviceGroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDevicesArgs = {
  filters?: InputMaybe<DeviceFilter>;
  ordering?: Array<DeviceOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryGroupArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGroupsArgs = {
  filters?: InputMaybe<GroupFilter>;
  ordering?: Array<GroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryHubArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHubsArgs = {
  filters?: InputMaybe<HubFilter>;
  ordering?: Array<HubOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryInvitesArgs = {
  filters?: InputMaybe<InviteFilter>;
  ordering?: Array<InviteOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryLayerArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLayersArgs = {
  filters?: InputMaybe<LayerFilter>;
  ordering?: Array<LayerOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMandateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMandatesArgs = {
  filters?: InputMaybe<MandateFilter>;
  ordering?: Array<MandateOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMembershipRequestsArgs = {
  filters?: InputMaybe<MembershipRequestFilter>;
  ordering?: Array<MembershipRequestOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMembershipStatsArgs = {
  filters?: InputMaybe<MembershipFilter>;
};


export type QueryMessageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMyManagedClientsArgs = {
  kind: ClientKind;
};


export type QueryOrganizationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOrganizationsArgs = {
  filters?: InputMaybe<OrganizationFilter>;
  ordering?: Array<OrganizationOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryReleaseArgs = {
  clientId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  identifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
  version?: InputMaybe<Scalars['Version']['input']>;
};


export type QueryReleasesArgs = {
  filters?: InputMaybe<ReleaseFilter>;
  ordering?: Array<ReleaseOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryRoleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRolesArgs = {
  filters?: InputMaybe<RoleFilter>;
  ordering?: Array<RoleOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryServiceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryServiceInstanceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryServiceInstancesArgs = {
  filters?: InputMaybe<ServiceInstanceFilter>;
  ordering?: Array<ServiceInstanceOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryServiceReleaseArgs = {
  id: Scalars['ID']['input'];
};


export type QueryServiceReleasesArgs = {
  filters?: InputMaybe<ServiceReleaseFilter>;
  ordering?: Array<ServiceReleaseOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryServicesArgs = {
  filters?: InputMaybe<ServiceFilter>;
  ordering?: Array<ServiceOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserStatsArgs = {
  filters?: InputMaybe<UserFilter>;
};


export type QueryUsersArgs = {
  filters?: InputMaybe<UserFilter>;
  ordering?: Array<UserOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type RegisterComChannelInput = {
  token: Scalars['String']['input'];
};

/** A Release is a version of an app. Releases might change over time. E.g. a release might be updated to fix a bug, and the release might be updated to add a new feature. This is why they are the home for `scopes` and `requirements`, which might change over the release cycle. */
export type Release = {
  __typename?: 'Release';
  /** The app that this release belongs to. */
  app: App;
  /** How many clients run the release. */
  clientCount: Scalars['Int']['output'];
  /** The clients of the release */
  clients: Array<Client>;
  id: Scalars['ID']['output'];
  /** The logo of the release. This should be a url to a logo that can be used to represent the release. */
  logo?: Maybe<MediaStore>;
  /** The name of the release. This should be a string that identifies the release beyond the version number. E.g. `canary`. */
  name: Scalars['String']['output'];
  /** The requirements of the release: the services (by key and service identifier) a client of this release needs composed against it. Each entry is a manifest `Requirement` object (`key`, `service`, `optional`, `description`). */
  requirements: Array<Scalars['JSON']['output']>;
  /** The scopes of the release. Scopes are used to limit the access of a client to a user's data. They represent app-level permissions. */
  scopes: Array<Scalars['String']['output']>;
  /** The version of the release. This should be a string that identifies the version of the release. We enforce semantic versioning notation. E.g. `0.1.0`. The version is unique per app. */
  version: Scalars['Version']['output'];
};


/** A Release is a version of an app. Releases might change over time. E.g. a release might be updated to fix a bug, and the release might be updated to add a new feature. This is why they are the home for `scopes` and `requirements`, which might change over the release cycle. */
export type ReleaseClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  ordering?: Array<ClientOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Release(id, app, version, is_latest, is_dev, name, logo, scopes, requirements) */
export type ReleaseFilter = {
  AND?: InputMaybe<ReleaseFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ReleaseFilter>;
  OR?: InputMaybe<ReleaseFilter>;
  /** Only the releases of these apps. */
  apps?: InputMaybe<Array<Scalars['ID']['input']>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Releases whose version, name or app name or identifier contain this (any case). */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ReleaseOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type RenderInput = {
  client: Scalars['ID']['input'];
  hub?: InputMaybe<Scalars['ID']['input']>;
  manifest?: InputMaybe<ManifestInput>;
  request?: InputMaybe<LinkingRequestInput>;
};

export type RequestMediaUploadInput = {
  /** MIME type of the file. The upload must send the same Content-Type. Guessed from `key` when omitted. */
  contentType?: InputMaybe<Scalars['String']['input']>;
  datalayer: Scalars['String']['input'];
  key: Scalars['String']['input'];
};

export type RequestMembershipInput = {
  organization: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type RequirementInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  optional?: Scalars['Boolean']['input'];
  service: Scalars['String']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};

/** A requirement as a mandate pins it. */
export type RequirementPin = {
  __typename?: 'RequirementPin';
  key: Scalars['String']['output'];
  service: Scalars['String']['output'];
};

export type ResolveBugReportInput = {
  id: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
};

export type RevokeMandateInput = {
  id: Scalars['ID']['input'];
};

/** A Role is a set of permissions that can be assigned to a user. It is used to define what a user can do in the system. */
export type Role = {
  __typename?: 'Role';
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
  /** The role lets a member do everything in the service declaring it. Lok gives it to the organization's owner and admins. */
  isAdminRole: Scalars['Boolean']['output'];
  /** Every full member holds the role, unless an admin took it away. */
  isDefaultRole: Scalars['Boolean']['output'];
  organization: Organization;
};

/** __doc__ */
export type RoleFilter = {
  AND?: InputMaybe<RoleFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RoleFilter>;
  OR?: InputMaybe<RoleFilter>;
  identifier?: InputMaybe<StrFilterLookup>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type RoleOrdering =
  { id: Ordering; };

/** A scope that can be assigned to a client. Scopes are used to limit the access of a client to a user's data. They represent app-level permissions. */
export type Scope = {
  __typename?: 'Scope';
  /** The description of the scope. This is a human readable description of the scope. */
  description: Scalars['String']['output'];
  /** The label of the scope. This is the human readable name of the scope. */
  label: Scalars['String']['output'];
  /** The value of the scope. This is the value that is used in the OAuth2 flow. */
  value: Scalars['String']['output'];
};

/** A Service is a Webservice that a Client might want to access. It is not the configured instance of the service, but the service itself. */
export type Service = {
  __typename?: 'Service';
  /** The description of the service. This should be a human readable description of the service. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The identifier of the service. This should be a globally unique string that identifies the service. We encourage you to use the reverse domain name notation. E.g. `com.example.myservice` */
  identifier: Scalars['ServiceIdentifier']['output'];
  /** The logo of the service. This should be a url to a logo that can be used to represent the service. */
  logo?: Maybe<MediaStore>;
  /** The name of the service */
  name: Scalars['String']['output'];
  /** The releases of the service. A service release is a specific version of a service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
  releases: Array<ServiceRelease>;
};


/** A Service is a Webservice that a Client might want to access. It is not the configured instance of the service, but the service itself. */
export type ServiceReleasesArgs = {
  filters?: InputMaybe<ServiceReleaseFilter>;
  ordering?: Array<ServiceReleaseOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Service(id, name, identifier, organization, logo, description) */
export type ServiceFilter = {
  AND?: InputMaybe<ServiceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ServiceFilter>;
  OR?: InputMaybe<ServiceFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstance = {
  __typename?: 'ServiceInstance';
  /** The aliases of the instance. An alias is a way to reach the instance. Clients can use these aliases to check if they can reach the instance. */
  aliases: Array<InstanceAlias>;
  /** The groups that are allowed to use this instance. */
  allowedGroups: Array<Group>;
  /** The users that are allowed to use this instance. */
  allowedUsers: Array<User>;
  /** The groups that are denied to use this instance. */
  deniedGroups: Array<Group>;
  /** The users that are denied to use this instance. */
  deniedUsers: Array<User>;
  id: Scalars['ID']['output'];
  /** The instance id of the instance. This is a unique string that identifies the instance. It is used to identify the instance in the code and in the database. */
  instanceId: Scalars['ID']['output'];
  /** The logo of the app. This should be a url to a logo that can be used to represent the app. */
  logo?: Maybe<MediaStore>;
  /** The mappings of the hub. A mapping is a mapping of a service to a service instance. This is used to configure the hub. */
  mappings: Array<ServiceInstanceMapping>;
  /** A human readable name of the instance, derived from its service identifier and instance id. */
  name: Scalars['String']['output'];
  /** The service release that this instance belongs to. */
  release: ServiceRelease;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceAliasesArgs = {
  ordering?: Array<InstanceAliasOrdering>;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceAllowedGroupsArgs = {
  filters?: InputMaybe<GroupFilter>;
  ordering?: Array<GroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceAllowedUsersArgs = {
  filters?: InputMaybe<UserFilter>;
  ordering?: Array<UserOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceDeniedGroupsArgs = {
  filters?: InputMaybe<GroupFilter>;
  ordering?: Array<GroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceDeniedUsersArgs = {
  filters?: InputMaybe<UserFilter>;
  ordering?: Array<UserOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceMappingsArgs = {
  ordering?: Array<ServiceInstanceMappingOrdering>;
};

/**
 * One service running in a hub, named by its name there (``instance_id``: ``mikro``).
 *
 * The hub names its services itself: the name is unique within the hub, and with the hub's own
 * uuid (``Hub.uid``) it is what a token composed for the service says (``aud: [mikro]``,
 * ``hub: <uid>``) and what a guest's collaborations are listed under. Authorized again, by
 * another admin or with another release, it is the same instance, updated in place.
 */
export type ServiceInstanceFilter = {
  AND?: InputMaybe<ServiceInstanceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ServiceInstanceFilter>;
  OR?: InputMaybe<ServiceInstanceFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A ServiceInstanceMapping binds one of a client's requirements (by key) to the ServiceInstance that fulfils it. The set of mappings of a client is its composed configuration. */
export type ServiceInstanceMapping = {
  __typename?: 'ServiceInstanceMapping';
  /** The client whose requirement this mapping fulfils. */
  client: Client;
  id: Scalars['ID']['output'];
  /** The service instance this requirement is mapped to. */
  instance: ServiceInstance;
  /** The requirement key of the client that this mapping fulfils. Unique per client. */
  key: Scalars['String']['output'];
  /** Is this mapping optional? If a mapping is optional, you can configure the client without this mapping. */
  optional: Scalars['Boolean']['output'];
};

export type ServiceInstanceMappingOrdering =
  { id: Ordering; };

export type ServiceInstanceOrdering =
  { id: Ordering; };

export type ServiceOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/** A ServiceRelease is a specific release of a Service. It contains the configuration for a particular version of the service. */
export type ServiceRelease = {
  __typename?: 'ServiceRelease';
  id: Scalars['ID']['output'];
  /** The instances of the service. A service instance is a configured instance of a service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
  instances: Array<ServiceInstance>;
  /** The service that this release belongs to. */
  service: Service;
  /** The version of the service. This should be a human readable version string. */
  version: Scalars['String']['output'];
};


/** A ServiceRelease is a specific release of a Service. It contains the configuration for a particular version of the service. */
export type ServiceReleaseInstancesArgs = {
  filters?: InputMaybe<ServiceInstanceFilter>;
  ordering?: Array<ServiceInstanceOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** ServiceRelease(id, service, version) */
export type ServiceReleaseFilter = {
  AND?: InputMaybe<ServiceReleaseFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ServiceReleaseFilter>;
  OR?: InputMaybe<ServiceReleaseFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ServiceReleaseOrdering =
  { id: Ordering; };

/** One collaboration a collaboration invite grants, by its key, with the roles that hold inside it. */
export type SharedCollaboration = {
  __typename?: 'SharedCollaboration';
  /** The collaboration's key: what every service of the organization names it by. */
  collaboration: Scalars['ID']['output'];
  /** Identifiers of the organization's roles that hold inside the collaboration. Empty: view only. */
  roles: Array<Scalars['String']['output']>;
};

export type SharedCollaborationInput = {
  /** The collaboration's key (`createCollaboration`): one across all of the organization's services. */
  collaboration: Scalars['ID']['input'];
  /** Identifiers of the organization's roles that hold for the guest inside the collaboration. Empty: view only. */
  roles?: Array<Scalars['String']['input']>;
};

export type StrFilterLookup = {
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  exact?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  iContains?: InputMaybe<Scalars['String']['input']>;
  iEndsWith?: InputMaybe<Scalars['String']['input']>;
  iExact?: InputMaybe<Scalars['String']['input']>;
  iRegex?: InputMaybe<Scalars['String']['input']>;
  iStartsWith?: InputMaybe<Scalars['String']['input']>;
  inList?: InputMaybe<Array<Scalars['String']['input']>>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  range?: InputMaybe<Array<Scalars['String']['input']>>;
  regex?: InputMaybe<Scalars['String']['input']>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  hubHealth: Hub;
  membershipRequests: MembershipRequestEvent;
  myMessages: SystemMessageEvent;
};


export type SubscriptionHubHealthArgs = {
  hub?: InputMaybe<Scalars['ID']['input']>;
};

/**
 *
 * A System Message is a message that is sent to a user.
 * It can be used to notify the user of important events or to request their attention.
 * System messages can use Rekuest Hooks as actions to allow the user to interact with the message.
 *
 *
 *
 */
export type SystemMessage = {
  __typename?: 'SystemMessage';
  /** The action to take (e.g. the node) */
  action: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  message?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  user: User;
};

/** A change to one of the caller's system messages. Exactly one field is set. */
export type SystemMessageEvent = {
  __typename?: 'SystemMessageEvent';
  /** A message the caller just got. */
  create?: Maybe<SystemMessage>;
  /** The id of a message of the caller that was deleted. */
  delete?: Maybe<Scalars['ID']['output']>;
  /** A message of the caller that changed (e.g. was acknowledged). */
  update?: Maybe<SystemMessage>;
};

export type TimeBucket = {
  __typename?: 'TimeBucket';
  avg?: Maybe<Scalars['Float']['output']>;
  count: Scalars['Int']['output'];
  distinctCount: Scalars['Int']['output'];
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
  sum?: Maybe<Scalars['Float']['output']>;
  ts: Scalars['DateTime']['output'];
};

export type UnresolveBugReportInput = {
  id: Scalars['ID']['input'];
};

export type UpdateCollaborationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateDeviceInput = {
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGroupProfileInput = {
  avatar: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type UpdateMembershipColorsInput = {
  brandChroma?: InputMaybe<Scalars['Float']['input']>;
  brandHue?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateOrganizationInput = {
  avatar?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProfileInput = {
  avatar: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type UpdateServiceInstanceInput = {
  allowedGroups?: InputMaybe<Array<Scalars['ID']['input']>>;
  allowedUsers?: InputMaybe<Array<Scalars['ID']['input']>>;
  deniedGroups?: InputMaybe<Array<Scalars['ID']['input']>>;
  deniedUsers?: InputMaybe<Array<Scalars['ID']['input']>>;
  id: Scalars['ID']['input'];
};

/**
 *
 * A User is a person that can log in to the system. They are uniquely identified by their username.
 * And can have an email address associated with them (but don't have to).
 *
 * A user can be assigned to groups and has a profile that can be used to display information about them.
 * Detail information about a user can be found in the profile.
 *
 * All users can have social accounts associated with them. These are used to authenticate the user with external services,
 * such as ORCID or GitHub.
 *
 *
 */
export type User = {
  __typename?: 'User';
  /** A short-lived URL of the user's avatar (`profile.avatar`), if they have one. */
  avatar?: Maybe<Scalars['String']['output']>;
  /** The communication channels that the user has */
  comChannels: Array<ComChannel>;
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  /** The groups this user belongs to. A user will get all permissions granted to each of their groups. */
  groups: Array<Group>;
  id: Scalars['ID']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  /** The memberships of the user in organizations */
  memberships: Array<Membership>;
  profile: Profile;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: Scalars['String']['output'];
};


/**
 *
 * A User is a person that can log in to the system. They are uniquely identified by their username.
 * And can have an email address associated with them (but don't have to).
 *
 * A user can be assigned to groups and has a profile that can be used to display information about them.
 * Detail information about a user can be found in the profile.
 *
 * All users can have social accounts associated with them. These are used to authenticate the user with external services,
 * such as ORCID or GitHub.
 *
 *
 */
export type UserComChannelsArgs = {
  filters?: InputMaybe<ComChannelFilter>;
  ordering?: Array<ComChannelOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/**
 *
 * A User is a person that can log in to the system. They are uniquely identified by their username.
 * And can have an email address associated with them (but don't have to).
 *
 * A user can be assigned to groups and has a profile that can be used to display information about them.
 * Detail information about a user can be found in the profile.
 *
 * All users can have social accounts associated with them. These are used to authenticate the user with external services,
 * such as ORCID or GitHub.
 *
 *
 */
export type UserGroupsArgs = {
  filters?: InputMaybe<GroupFilter>;
  ordering?: Array<GroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/**
 *
 * A User is a person that can log in to the system. They are uniquely identified by their username.
 * And can have an email address associated with them (but don't have to).
 *
 * A user can be assigned to groups and has a profile that can be used to display information about them.
 * Detail information about a user can be found in the profile.
 *
 * All users can have social accounts associated with them. These are used to authenticate the user with external services,
 * such as ORCID or GitHub.
 *
 *
 */
export type UserMembershipsArgs = {
  filters?: InputMaybe<MembershipFilter>;
  ordering?: Array<MembershipOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Numeric/aggregatable fields of User */
export enum UserField {
  CreatedAt = 'CREATED_AT'
}

/**
 * A User of the System
 *
 * Lok Users are the main users of the system. They can be assigned to groups and have profiles, that can be used to display information about them.
 * Each user is identifier by a unique username, and can have an email address associated with them.
 */
export type UserFilter = {
  AND?: InputMaybe<UserFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<UserFilter>;
  OR?: InputMaybe<UserFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username?: InputMaybe<StrFilterLookup>;
};

export type UserOrdering =
  { id: Ordering; };

export type UserStats = {
  __typename?: 'UserStats';
  /** Average */
  avg?: Maybe<Scalars['Float']['output']>;
  /** Total number of items in the selection */
  count: Scalars['Int']['output'];
  /** Number of distinct values for the field */
  distinctCount: Scalars['Int']['output'];
  /** Maximum */
  max?: Maybe<Scalars['Float']['output']>;
  /** Minimum */
  min?: Maybe<Scalars['Float']['output']>;
  /** Time-bucketed stats over a datetime field. */
  series: Array<TimeBucket>;
  /** Sum */
  sum?: Maybe<Scalars['Float']['output']>;
};


export type UserStatsAvgArgs = {
  field: UserField;
};


export type UserStatsDistinctCountArgs = {
  field: UserField;
};


export type UserStatsMaxArgs = {
  field: UserField;
};


export type UserStatsMinArgs = {
  field: UserField;
};


export type UserStatsSeriesArgs = {
  by: Granularity;
  field: UserField;
  timestampField: UserTimestampField;
};


export type UserStatsSumArgs = {
  field: UserField;
};

/** Datetime fields of User for bucketing */
export enum UserTimestampField {
  CreatedAt = 'CREATED_AT'
}

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type ListInstanceAliasFragment = { __typename?: 'InstanceAlias', host?: string | null, port?: number | null, ssl: boolean, challenge: string, kind: string };

export type DetailAppFragment = { __typename?: 'App', id: string, identifier: any, releaseCount: number, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, releases: Array<(
    { __typename?: 'Release' }
    & ListReleaseFragment
  )> };

export type ListAppFragment = { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ListBugReportFragment = { __typename?: 'BugReport', id: string, title: string, route?: string | null, appVersion?: string | null, createdAt: any, isResolved: boolean, forwardedAt?: any | null, hasScreenshot: boolean, reporter?: { __typename?: 'User', id: string, username: string } | null, client?: { __typename?: 'Client', id: string, name: string, node?: { __typename?: 'Device', id: string, name?: string | null } | null } | null, release?: { __typename?: 'Release', id: string, version: any, app: { __typename?: 'App', id: string, identifier: any } } | null };

export type DetailBugReportFragment = (
  { __typename?: 'BugReport', description: string, expected?: string | null, platform?: string | null, diagnostics: any, screenshot?: string | null, resolvedAt?: any | null, resolutionNote?: string | null, forwardedUrl?: string | null, resolvedBy?: { __typename?: 'User', id: string, username: string } | null, forwardedBy?: { __typename?: 'User', id: string, username: string } | null, client?: { __typename?: 'Client', id: string, name: string, issueUrl?: string | null, node?: { __typename?: 'Device', id: string, name?: string | null } | null } | null }
  & ListBugReportFragment
);

export type DetailClientFragment = { __typename?: 'Client', id: string, clientId: string, name: string, public: boolean, kind: ClientKind, role: ClientRole, issueUrl?: string | null, user?: { __typename?: 'User', id: string, username: string } | null, release?: (
    { __typename?: 'Release' }
    & ListReleaseFragment
  ) | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, node?: { __typename?: 'Device', id: string, name?: string | null } | null, publicSources: Array<{ __typename?: 'PublicSource', kind: string, url: string }> };

export type ListClientFragment = { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, node?: { __typename?: 'Device', id: string, name?: string | null } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null };

export type ClientChipFragment = { __typename?: 'Client', id: string, clientId: string, name: string, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, release?: { __typename?: 'Release', id: string, version: any, app: { __typename?: 'App', id: string, identifier: any } } | null };

export type CollaborationFragment = { __typename?: 'Collaboration', key: string, name: string, description?: string | null, createdAt: any, id: string, lokId: string, createdBy?: { __typename?: 'User', id: string, username: string } | null };

export type DetailDeviceFragment = { __typename?: 'Device', id: string, name?: string | null, nodeId: string, deviceId: string, clientCount: number, deviceGroups: Array<(
    { __typename?: 'DeviceGroup' }
    & ListDeviceGroupFragment
  )>, clients: Array<(
    { __typename?: 'Client' }
    & ListClientFragment
  )> };

export type ListDeviceFragment = { __typename?: 'Device', id: string, name?: string | null, nodeId: string };

export type BrowseDeviceFragment = { __typename?: 'Device', id: string, name?: string | null, deviceId: string, clientCount: number, deviceGroups: Array<{ __typename?: 'DeviceGroup', id: string, name: string }> };

export type DeviceChipFragment = { __typename?: 'Device', id: string, name?: string | null, deviceId: string };

export type ContextFragment = { __typename?: 'Context', roles: Array<string>, scope: Array<string>, organization: { __typename?: 'Organization', id: string, name: string, slug: string, brandHue?: number | null, brandChroma?: number | null }, user: { __typename?: 'User', id: string, username: string }, membership?: { __typename?: 'Membership', id: string, brandHue?: number | null, brandChroma?: number | null } | null, hub?: { __typename?: 'Hub', id: string, name: string, identifier: any } | null };

export type PresignedPostCredentialsFragment = { __typename?: 'PresignedPostCredentials', xAmzAlgorithm: string, xAmzCredential: string, xAmzDate: string, xAmzSignature: string, key: string, bucket: string, datalayer: string, policy: string, store: string, contentType: string };

export type ListDeviceGroupFragment = { __typename?: 'DeviceGroup', id: string, name: string };

export type ListGroupFragment = { __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null };

export type GroupProfileFragment = { __typename?: 'GroupProfile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type InstanceHealthFragment = { __typename?: 'InstanceHealth', healthy: boolean, reason?: string | null, instance: { __typename?: 'ServiceInstance', id: string, instanceId: string, name: string, aliases: Array<{ __typename?: 'InstanceAlias', id: string }> } };

export type HubHealthFragment = { __typename?: 'Hub', id: string, name: string, identifier: any, version: string, online: boolean, lastSeenAt?: any | null, offlineAt?: any | null, lastHealthy?: boolean | null, meshConnected?: boolean | null, meshHost: string, latestHealth?: { __typename?: 'HubHealthReport', id: string, healthy: boolean, createdAt: any, instances: Array<(
      { __typename?: 'InstanceHealth' }
      & InstanceHealthFragment
    )> } | null };

export type TeamInviteFragment = { __typename?: 'Invite', id: string, createdAt: any, valid: boolean, status: string, expiresAt?: any | null, token: string, inviteUrl: string, roles: Array<{ __typename?: 'Role', id: string, identifier: string }>, acceptedBy?: { __typename?: 'User', id: string, username: string } | null };

export type CollaborationLinkFragment = { __typename?: 'Invite', id: string, inviteUrl: string, expiresAt?: any | null, uses: number, maxUses?: number | null, mesh: boolean, valid: boolean, collaborations?: Array<{ __typename?: 'SharedCollaboration', collaboration: string, roles: Array<string> }> | null };

export type LayerFragment = { __typename?: 'Layer', id: string, name: string, identifier: any, description?: string | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ListLayerFragment = { __typename?: 'Layer', id: string, name: string, identifier: any, description?: string | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ListMandateFragment = { __typename?: 'Mandate', id: string, label: string, keyPrefix: string, claimant: MandateClaimant, origin: MandateOrigin, agentIdentifier?: string | null, attestation: string, maxClients?: number | null, createdAt: any, expiresAt?: any | null, revokedAt?: any | null, isLive: boolean, clientCount: number, subject: { __typename?: 'MandatePin', identifier?: string | null, version?: string | null, deviceId?: string | null, scopes?: Array<string> | null }, grantor: { __typename?: 'User', id: string, username: string }, agentDevice?: { __typename?: 'Device', id: string, deviceId: string, name?: string | null } | null, agentUser?: { __typename?: 'User', id: string, username: string } | null };

export type DetailMandateFragment = (
  { __typename?: 'Mandate', clients: Array<{ __typename?: 'Client', id: string, clientId: string, name: string, node?: { __typename?: 'Device', id: string, name?: string | null } | null }>, hub: { __typename?: 'Hub', id: string, name: string, identifier: any } }
  & ListMandateFragment
);

export type MembershipFragment = { __typename?: 'Membership', id: string, brandHue?: number | null, brandChroma?: number | null, roles: Array<{ __typename?: 'Role', identifier: string, id: string }>, organization: (
    { __typename?: 'Organization' }
    & ListOrganizationFragment
  ) };

export type TeamMemberFragment = { __typename?: 'Membership', id: string, createdAt?: any | null, roles: Array<{ __typename?: 'Role', id: string, identifier: string }>, user: { __typename?: 'User', id: string, username: string, firstName?: string | null, lastName?: string | null, profile: { __typename?: 'Profile', id: string, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } } };

export type MembershipRequestFragment = { __typename?: 'MembershipRequest', id: string, reason?: string | null, status: string, createdAt: any, user: { __typename?: 'User', id: string, username: string } };

export type OrganizationFragment = { __typename?: 'Organization', id: string, name: string, slug: string, description?: string | null, brandHue?: number | null, brandChroma?: number | null, roles: Array<{ __typename?: 'Role', id: string, identifier: string, description: string, isAdminRole: boolean, isDefaultRole: boolean }>, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null, profile: { __typename?: 'OrganizationProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type ListOrganizationFragment = { __typename?: 'Organization', id: string, name: string, slug: string, brandHue?: number | null, brandChroma?: number | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ProfileFragment = { __typename?: 'Profile', id: string, name?: string | null, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type DetailReleaseFragment = { __typename?: 'Release', id: string, version: any, clientCount: number, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: (
    { __typename?: 'App' }
    & ListAppFragment
  ), clients: Array<(
    { __typename?: 'Client' }
    & ListClientFragment
  )> };

export type ListReleaseFragment = { __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: (
    { __typename?: 'App' }
    & ListAppFragment
  ) };

export type ListServiceFragment = { __typename?: 'Service', identifier: any, id: string, name: string, description?: string | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ServiceFragment = { __typename?: 'Service', identifier: any, id: string, name: string, description?: string | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ServiceInstanceFragment = { __typename?: 'ServiceInstance', id: string, release: { __typename?: 'ServiceRelease', version: string, service: { __typename?: 'Service', identifier: any, id: string, description?: string | null, name: string } }, allowedUsers: Array<(
    { __typename?: 'User' }
    & ListUserFragment
  )>, deniedUsers: Array<(
    { __typename?: 'User' }
    & ListUserFragment
  )>, allowedGroups: Array<(
    { __typename?: 'Group' }
    & ListGroupFragment
  )>, deniedGroups: Array<(
    { __typename?: 'Group' }
    & ListGroupFragment
  )>, mappings: Array<(
    { __typename?: 'ServiceInstanceMapping' }
    & ListServiceInstanceMappingFragment
  )>, aliases: Array<(
    { __typename?: 'InstanceAlias' }
    & ListInstanceAliasFragment
  )>, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ListServiceInstanceFragment = { __typename?: 'ServiceInstance', id: string, release: { __typename?: 'ServiceRelease', version: string, service: { __typename?: 'Service', identifier: any, id: string, description?: string | null, name: string } }, allowedUsers: Array<{ __typename?: 'User', id: string, username: string }>, deniedUsers: Array<{ __typename?: 'User', id: string, username: string }> };

export type ListServiceInstanceMappingFragment = { __typename?: 'ServiceInstanceMapping', id: string, key: string, optional: boolean, instance: { __typename?: 'ServiceInstance', id: string }, client: (
    { __typename?: 'Client' }
    & ListClientFragment
  ) };

export type ListUserFragment = { __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, id: string, profile: (
    { __typename?: 'Profile' }
    & ProfileFragment
  ) };

export type DetailUserFragment = { __typename?: 'User', id: string, username: string, email?: string | null, firstName?: string | null, lastName?: string | null, profile: (
    { __typename?: 'Profile' }
    & ProfileFragment
  ), memberships: Array<{ __typename?: 'Membership', id: string, roles: Array<{ __typename?: 'Role', id: string, identifier: string }> }> };

export type MeUserFragment = { __typename?: 'User', id: string, username: string, email?: string | null, firstName?: string | null, lastName?: string | null };

export type UserChipFragment = { __typename?: 'User', id: string, username: string, profile: { __typename?: 'Profile', id: string, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type CreateBugReportMutationVariables = Exact<{
  input: CreateBugReportInput;
}>;


export type CreateBugReportMutation = { __typename?: 'Mutation', createBugReport: { __typename?: 'BugReport', id: string, title: string } };

export type ResolveBugReportMutationVariables = Exact<{
  input: ResolveBugReportInput;
}>;


export type ResolveBugReportMutation = { __typename?: 'Mutation', resolveBugReport: (
    { __typename?: 'BugReport' }
    & DetailBugReportFragment
  ) };

export type UnresolveBugReportMutationVariables = Exact<{
  input: UnresolveBugReportInput;
}>;


export type UnresolveBugReportMutation = { __typename?: 'Mutation', unresolveBugReport: (
    { __typename?: 'BugReport' }
    & DetailBugReportFragment
  ) };

export type ForwardBugReportMutationVariables = Exact<{
  input: ForwardBugReportInput;
}>;


export type ForwardBugReportMutation = { __typename?: 'Mutation', forwardBugReport: (
    { __typename?: 'BugReport' }
    & DetailBugReportFragment
  ) };

export type DeleteBugReportMutationVariables = Exact<{
  input: DeleteBugReportInput;
}>;


export type DeleteBugReportMutation = { __typename?: 'Mutation', deleteBugReport: string };

export type CreateCollaborationMutationVariables = Exact<{
  input: CreateCollaborationInput;
}>;


export type CreateCollaborationMutation = { __typename?: 'Mutation', createCollaboration: (
    { __typename?: 'Collaboration' }
    & CollaborationFragment
  ) };

export type UpdateCollaborationMutationVariables = Exact<{
  input: UpdateCollaborationInput;
}>;


export type UpdateCollaborationMutation = { __typename?: 'Mutation', updateCollaboration: (
    { __typename?: 'Collaboration' }
    & CollaborationFragment
  ) };

export type DeleteCollaborationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCollaborationMutation = { __typename?: 'Mutation', deleteCollaboration: string };

export type UpdateDeviceMutationVariables = Exact<{
  input: UpdateDeviceInput;
}>;


export type UpdateDeviceMutation = { __typename?: 'Mutation', updateDevice: (
    { __typename?: 'Device' }
    & DetailDeviceFragment
  ) };

export type CreateGroupProfileMutationVariables = Exact<{
  input: CreateGroupProfileInput;
}>;


export type CreateGroupProfileMutation = { __typename?: 'Mutation', createGroupProfile: (
    { __typename?: 'GroupProfile' }
    & GroupProfileFragment
  ) };

export type UpdateGroupProfileMutationVariables = Exact<{
  input: UpdateGroupProfileInput;
}>;


export type UpdateGroupProfileMutation = { __typename?: 'Mutation', updateGroupProfile: (
    { __typename?: 'GroupProfile' }
    & GroupProfileFragment
  ) };

export type UpdateServiceInstanceMutationVariables = Exact<{
  input: UpdateServiceInstanceInput;
}>;


export type UpdateServiceInstanceMutation = { __typename?: 'Mutation', updateServiceInstance: (
    { __typename?: 'ServiceInstance' }
    & ServiceInstanceFragment
  ) };

export type CreateServiceInstanceMutationVariables = Exact<{
  input: CreateServiceInstanceInput;
}>;


export type CreateServiceInstanceMutation = { __typename?: 'Mutation', createServiceInstance: (
    { __typename?: 'ServiceInstance' }
    & ServiceInstanceFragment
  ) };

export type CreateInviteMutationVariables = Exact<{
  input: CreateInviteInput;
}>;


export type CreateInviteMutation = { __typename?: 'Mutation', createInvite: (
    { __typename?: 'Invite' }
    & TeamInviteFragment
  ) };

export type ShareCollaborationMutationVariables = Exact<{
  input: CreateInviteInput;
}>;


export type ShareCollaborationMutation = { __typename?: 'Mutation', createInvite: (
    { __typename?: 'Invite' }
    & CollaborationLinkFragment
  ) };

export type RevokeCollaborationLinkMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeCollaborationLinkMutation = { __typename?: 'Mutation', cancelInvite: { __typename?: 'Invite', id: string } };

export type CancelInviteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelInviteMutation = { __typename?: 'Mutation', cancelInvite: { __typename?: 'Invite', id: string, status: string, valid: boolean } };

export type CreateMandateMutationVariables = Exact<{
  input: CreateMandateInput;
}>;


export type CreateMandateMutation = { __typename?: 'Mutation', createMandate: (
    { __typename?: 'Mandate' }
    & DetailMandateFragment
  ) };

export type RevokeMandateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeMandateMutation = { __typename?: 'Mutation', revokeMandate: (
    { __typename?: 'Mandate' }
    & DetailMandateFragment
  ) };

export type IssueChildMandateKeyMutationVariables = Exact<{
  input: IssueChildMandateKeyInput;
}>;


export type IssueChildMandateKeyMutation = { __typename?: 'Mutation', issueChildMandateKey: { __typename?: 'IssuedMandateKey', key: string, mandate: (
      { __typename?: 'Mandate' }
      & DetailMandateFragment
    ) } };

export type UpdateMembershipColorsMutationVariables = Exact<{
  input: UpdateMembershipColorsInput;
}>;


export type UpdateMembershipColorsMutation = { __typename?: 'Mutation', updateMembershipColors: (
    { __typename?: 'Membership' }
    & MembershipFragment
  ) };

export type RequestMembershipMutationVariables = Exact<{
  input: RequestMembershipInput;
}>;


export type RequestMembershipMutation = { __typename?: 'Mutation', requestMembership: boolean };

export type ApproveMembershipRequestMutationVariables = Exact<{
  input: ApproveMembershipRequestInput;
}>;


export type ApproveMembershipRequestMutation = { __typename?: 'Mutation', approveMembershipRequest: { __typename?: 'Membership', id: string } };

export type DeclineMembershipRequestMutationVariables = Exact<{
  input: DeclineMembershipRequestInput;
}>;


export type DeclineMembershipRequestMutation = { __typename?: 'Mutation', declineMembershipRequest: (
    { __typename?: 'MembershipRequest' }
    & MembershipRequestFragment
  ) };

export type NotifyUserMutationVariables = Exact<{
  input: NotifyUserInput;
}>;


export type NotifyUserMutation = { __typename?: 'Mutation', notifyUser: boolean };

export type UpdateOrganizationMutationVariables = Exact<{
  input: UpdateOrganizationInput;
}>;


export type UpdateOrganizationMutation = { __typename?: 'Mutation', updateOrganization: (
    { __typename?: 'Organization' }
    & OrganizationFragment
  ) };

export type CreateOrganizationMutationVariables = Exact<{
  input: CreateOrganizationInput;
}>;


export type CreateOrganizationMutation = { __typename?: 'Mutation', createOrganization: (
    { __typename?: 'Organization' }
    & OrganizationFragment
  ) };

export type CreateUserProfileMutationVariables = Exact<{
  input: CreateProfileInput;
}>;


export type CreateUserProfileMutation = { __typename?: 'Mutation', createProfile: (
    { __typename?: 'Profile' }
    & ProfileFragment
  ) };

export type UpdateUserProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateUserProfileMutation = { __typename?: 'Mutation', updateProfile: (
    { __typename?: 'Profile' }
    & ProfileFragment
  ) };

export type RequestMediaUploadMutationVariables = Exact<{
  key: Scalars['String']['input'];
  datalayer: Scalars['String']['input'];
  contentType?: InputMaybe<Scalars['String']['input']>;
}>;


export type RequestMediaUploadMutation = { __typename?: 'Mutation', requestMediaUpload: (
    { __typename?: 'PresignedPostCredentials' }
    & PresignedPostCredentialsFragment
  ) };

export type AddUserToOrganizationMutationVariables = Exact<{
  input: AddUserToOrganizationInput;
}>;


export type AddUserToOrganizationMutation = { __typename?: 'Mutation', addUserToOrganization: { __typename?: 'Membership', id: string } };

export type AppsQueryVariables = Exact<{
  filters?: InputMaybe<AppFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type AppsQuery = { __typename?: 'Query', apps: Array<(
    { __typename?: 'App' }
    & ListAppFragment
  )> };

export type DetailAppQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailAppQuery = { __typename?: 'Query', app: (
    { __typename?: 'App' }
    & DetailAppFragment
  ) };

export type BugReportsQueryVariables = Exact<{
  filters?: InputMaybe<BugReportFilter>;
  ordering?: InputMaybe<Array<BugReportOrdering> | BugReportOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type BugReportsQuery = { __typename?: 'Query', bugReports: Array<(
    { __typename?: 'BugReport' }
    & ListBugReportFragment
  )> };

export type DetailBugReportQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailBugReportQuery = { __typename?: 'Query', bugReport: (
    { __typename?: 'BugReport' }
    & DetailBugReportFragment
  ) };

export type ClientsQueryVariables = Exact<{
  filters?: InputMaybe<ClientFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ClientsQuery = { __typename?: 'Query', clients: Array<(
    { __typename?: 'Client' }
    & ListClientFragment
  )> };

export type DetailClientQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailClientQuery = { __typename?: 'Query', client: (
    { __typename?: 'Client' }
    & DetailClientFragment
  ) };

export type ClientQueryVariables = Exact<{
  clientId: Scalars['ID']['input'];
}>;


export type ClientQuery = { __typename?: 'Query', client: (
    { __typename?: 'Client' }
    & DetailClientFragment
  ) };

export type ClientChipQueryVariables = Exact<{
  clientId: Scalars['ID']['input'];
}>;


export type ClientChipQuery = { __typename?: 'Query', client: (
    { __typename?: 'Client' }
    & ClientChipFragment
  ) };

export type ClientChipsQueryVariables = Exact<{
  clientIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type ClientChipsQuery = { __typename?: 'Query', clientsByClientId: Array<{ __typename?: 'ClientByClientId', requestedId: string, client: (
      { __typename?: 'Client' }
      & ClientChipFragment
    ) }> };

export type CollaborationsQueryVariables = Exact<{
  filters?: InputMaybe<CollaborationFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type CollaborationsQuery = { __typename?: 'Query', collaborations: Array<(
    { __typename?: 'Collaboration' }
    & CollaborationFragment
  )> };

export type GetCollaborationQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetCollaborationQuery = { __typename?: 'Query', collaboration: (
    { __typename?: 'Collaboration' }
    & CollaborationFragment
  ) };

export type MyContextQueryVariables = Exact<{ [key: string]: never; }>;


export type MyContextQuery = { __typename?: 'Query', mycontext: (
    { __typename?: 'Context' }
    & ContextFragment
  ) };

export type IsMemberOfQueryVariables = Exact<{
  organization: Scalars['ID']['input'];
}>;


export type IsMemberOfQuery = { __typename?: 'Query', mycontext: { __typename?: 'Context', memberOf: boolean } };

export type BrowseDevicesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<DeviceFilter>;
  ordering?: InputMaybe<Array<DeviceOrdering> | DeviceOrdering>;
}>;


export type BrowseDevicesQuery = { __typename?: 'Query', devices: Array<(
    { __typename?: 'Device' }
    & BrowseDeviceFragment
  )> };

export type DeviceFilterOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type DeviceFilterOptionsQuery = { __typename?: 'Query', deviceGroups: Array<{ __typename?: 'DeviceGroup', id: string, name: string }> };

export type ListDevicesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<DeviceFilter>;
}>;


export type ListDevicesQuery = { __typename?: 'Query', devices: Array<(
    { __typename?: 'Device' }
    & ListDeviceFragment
  )> };

export type GetDeviceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDeviceQuery = { __typename?: 'Query', device: (
    { __typename?: 'Device' }
    & DetailDeviceFragment
  ) };

export type DeviceChipQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeviceChipQuery = { __typename?: 'Query', deviceByDeviceId: (
    { __typename?: 'Device' }
    & DeviceChipFragment
  ) };

export type DeviceChipsQueryVariables = Exact<{
  deviceIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  limit: Scalars['Int']['input'];
}>;


export type DeviceChipsQuery = { __typename?: 'Query', devices: Array<(
    { __typename?: 'Device' }
    & DeviceChipFragment
  )> };

export type GroupOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  limit?: Scalars['Int']['input'];
}>;


export type GroupOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Group', value: string, label: string }> };

export type MyHubHealthQueryVariables = Exact<{ [key: string]: never; }>;


export type MyHubHealthQuery = { __typename?: 'Query', mycontext: { __typename?: 'Context', hub?: (
      { __typename?: 'Hub' }
      & HubHealthFragment
    ) | null } };

export type CollaborationLinksQueryVariables = Exact<{
  collaboration?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CollaborationLinksQuery = { __typename?: 'Query', invites: Array<(
    { __typename?: 'Invite' }
    & CollaborationLinkFragment
  )> };

export type TeamInvitesQueryVariables = Exact<{
  filters?: InputMaybe<InviteFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type TeamInvitesQuery = { __typename?: 'Query', invites: Array<(
    { __typename?: 'Invite' }
    & TeamInviteFragment
  )> };

export type LayersQueryVariables = Exact<{
  filters?: InputMaybe<LayerFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type LayersQuery = { __typename?: 'Query', layers: Array<(
    { __typename?: 'Layer' }
    & ListLayerFragment
  )> };

export type DetailLayerQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailLayerQuery = { __typename?: 'Query', layer: (
    { __typename?: 'Layer' }
    & LayerFragment
  ) };

export type MandatesQueryVariables = Exact<{
  filters?: InputMaybe<MandateFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type MandatesQuery = { __typename?: 'Query', mandates: Array<(
    { __typename?: 'Mandate' }
    & ListMandateFragment
  )> };

export type GetMandateQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetMandateQuery = { __typename?: 'Query', mandate: (
    { __typename?: 'Mandate' }
    & DetailMandateFragment
  ) };

export type MandateStatusesQueryVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  limit: Scalars['Int']['input'];
}>;


export type MandateStatusesQuery = { __typename?: 'Query', mandates: Array<{ __typename?: 'Mandate', id: string, isLive: boolean, expiresAt?: any | null, revokedAt?: any | null }> };

export type StandingMandateQueryVariables = Exact<{
  agent: Scalars['AppIdentifier']['input'];
  subject: Scalars['AppIdentifier']['input'];
  allowMesh: Scalars['Boolean']['input'];
}>;


export type StandingMandateQuery = { __typename?: 'Query', mandates: Array<{ __typename?: 'Mandate', id: string }> };

export type TeamMembersQueryVariables = Exact<{
  organization: Scalars['ID']['input'];
  filters?: InputMaybe<MembershipFilter>;
  offset?: Scalars['Int']['input'];
  limit: Scalars['Int']['input'];
}>;


export type TeamMembersQuery = { __typename?: 'Query', organization: { __typename?: 'Organization', id: string, memberships: Array<(
      { __typename?: 'Membership' }
      & TeamMemberFragment
    )> }, membershipStats: { __typename?: 'MembershipStats', count: number } };

export type TeamCountsQueryVariables = Exact<{
  admins?: InputMaybe<MembershipFilter>;
}>;


export type TeamCountsQuery = { __typename?: 'Query', members: { __typename?: 'MembershipStats', count: number }, admins: { __typename?: 'MembershipStats', count: number } };

export type NewMembersQueryVariables = Exact<{
  organization: Scalars['ID']['input'];
  since: Scalars['DateTime']['input'];
  limit: Scalars['Int']['input'];
}>;


export type NewMembersQuery = { __typename?: 'Query', organization: { __typename?: 'Organization', id: string, newMembers: Array<(
      { __typename?: 'Membership', createdAt?: any | null }
      & TeamMemberFragment
    )> } };

export type PendingMembershipRequestsQueryVariables = Exact<{ [key: string]: never; }>;


export type PendingMembershipRequestsQuery = { __typename?: 'Query', membershipRequests: Array<(
    { __typename?: 'MembershipRequest' }
    & MembershipRequestFragment
  )> };

export type MyActiveMessagesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyActiveMessagesQuery = { __typename?: 'Query', myActiveMessages: Array<{ __typename?: 'SystemMessage', id: string, title?: string | null, message?: string | null, action: string }> };

export type OrganizationQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type OrganizationQuery = { __typename?: 'Query', organization: (
    { __typename?: 'Organization' }
    & OrganizationFragment
  ) };

export type ReleasesQueryVariables = Exact<{
  filters?: InputMaybe<ReleaseFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ReleasesQuery = { __typename?: 'Query', releases: Array<(
    { __typename?: 'Release' }
    & ListReleaseFragment
  )> };

export type DetailReleaseQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailReleaseQuery = { __typename?: 'Query', release: (
    { __typename?: 'Release' }
    & DetailReleaseFragment
  ) };

export type RoleOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type RoleOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Role', value: string, label: string }> };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  noUsers: Scalars['Boolean']['input'];
  noGroups: Scalars['Boolean']['input'];
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', users?: Array<{ __typename?: 'User', id: string, username: string, firstName?: string | null, lastName?: string | null }>, groups?: Array<{ __typename?: 'Group', id: string, name: string }> };

export type ListServiceInstancesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ServiceInstanceFilter>;
}>;


export type ListServiceInstancesQuery = { __typename?: 'Query', serviceInstances: Array<(
    { __typename?: 'ServiceInstance' }
    & ListServiceInstanceFragment
  )> };

export type GetServiceInstanceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetServiceInstanceQuery = { __typename?: 'Query', serviceInstance: (
    { __typename?: 'ServiceInstance' }
    & ServiceInstanceFragment
  ) };

export type ListServicesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ServiceFilter>;
}>;


export type ListServicesQuery = { __typename?: 'Query', services: Array<(
    { __typename?: 'Service' }
    & ListServiceFragment
  )> };

export type GetServiceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetServiceQuery = { __typename?: 'Query', service: (
    { __typename?: 'Service' }
    & ServiceFragment
  ) };

export type UserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserQuery = { __typename?: 'Query', user: (
    { __typename?: 'User' }
    & DetailUserFragment
  ) };

export type UserChipsQueryVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  limit: Scalars['Int']['input'];
}>;


export type UserChipsQuery = { __typename?: 'Query', users: Array<(
    { __typename?: 'User' }
    & UserChipFragment
  )> };

export type UserChipQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserChipQuery = { __typename?: 'Query', user: (
    { __typename?: 'User' }
    & UserChipFragment
  ) };

export type UsersQueryVariables = Exact<{
  filters?: InputMaybe<UserFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type UsersQuery = { __typename?: 'Query', users: Array<(
    { __typename?: 'User' }
    & ListUserFragment
  )> };

export type UserOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  limit?: Scalars['Int']['input'];
}>;


export type UserOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'User', value: string, label: string }> };

export type ProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfileQuery = { __typename?: 'Query', me: (
    { __typename?: 'User' }
    & MeUserFragment
  ) };

export type WatchMyMessagesSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchMyMessagesSubscription = { __typename?: 'Subscription', myMessages: { __typename?: 'SystemMessageEvent', delete?: string | null, create?: { __typename?: 'SystemMessage', id: string } | null, update?: { __typename?: 'SystemMessage', id: string } | null } };

export type WatchMembershipRequestsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchMembershipRequestsSubscription = { __typename?: 'Subscription', membershipRequests: { __typename?: 'MembershipRequestEvent', create?: (
      { __typename?: 'MembershipRequest' }
      & MembershipRequestFragment
    ) | null, update?: (
      { __typename?: 'MembershipRequest' }
      & MembershipRequestFragment
    ) | null } };

export type WatchHubHealthSubscriptionVariables = Exact<{
  hub?: InputMaybe<Scalars['ID']['input']>;
}>;


export type WatchHubHealthSubscription = { __typename?: 'Subscription', hubHealth: (
    { __typename?: 'Hub' }
    & HubHealthFragment
  ) };

export const ListAppFragmentDoc = gql`
    fragment ListApp on App {
  id
  identifier
  logo {
    presignedUrl
  }
}
    `;
export const ListReleaseFragmentDoc = gql`
    fragment ListRelease on Release {
  id
  version
  logo {
    presignedUrl
  }
  app {
    ...ListApp
  }
}
    ${ListAppFragmentDoc}`;
export const DetailAppFragmentDoc = gql`
    fragment DetailApp on App {
  id
  identifier
  logo {
    presignedUrl
  }
  releaseCount
  releases(pagination: {limit: 50}, ordering: [{id: DESC}]) {
    ...ListRelease
  }
}
    ${ListReleaseFragmentDoc}`;
export const ListBugReportFragmentDoc = gql`
    fragment ListBugReport on BugReport {
  id
  title
  route
  appVersion
  createdAt
  isResolved
  forwardedAt
  hasScreenshot
  reporter {
    id
    username
  }
  client {
    id
    name
    node {
      id
      name
    }
  }
  release {
    id
    version
    app {
      id
      identifier
    }
  }
}
    `;
export const DetailBugReportFragmentDoc = gql`
    fragment DetailBugReport on BugReport {
  ...ListBugReport
  description
  expected
  platform
  diagnostics
  screenshot
  resolvedAt
  resolutionNote
  resolvedBy {
    id
    username
  }
  forwardedUrl
  forwardedBy {
    id
    username
  }
  client {
    id
    name
    issueUrl
    node {
      id
      name
    }
  }
}
    ${ListBugReportFragmentDoc}`;
export const DetailClientFragmentDoc = gql`
    fragment DetailClient on Client {
  id
  clientId
  name
  public
  kind
  role
  user {
    id
    username
  }
  release {
    ...ListRelease
  }
  logo {
    presignedUrl
  }
  node {
    id
    name
  }
  issueUrl
  publicSources {
    kind
    url
  }
}
    ${ListReleaseFragmentDoc}`;
export const ClientChipFragmentDoc = gql`
    fragment ClientChip on Client {
  id
  clientId
  name
  logo {
    presignedUrl
  }
  release {
    id
    version
    app {
      id
      identifier
    }
  }
}
    `;
export const CollaborationFragmentDoc = gql`
    fragment Collaboration on Collaboration {
  id: key
  lokId: id
  key
  name
  description
  createdAt
  createdBy {
    id
    username
  }
}
    `;
export const ListDeviceGroupFragmentDoc = gql`
    fragment ListDeviceGroup on DeviceGroup {
  id
  name
}
    `;
export const ListClientFragmentDoc = gql`
    fragment ListClient on Client {
  id
  user {
    id
    username
  }
  logo {
    presignedUrl
  }
  node {
    id
    name
  }
  name
  kind
  release {
    version
    logo {
      presignedUrl
    }
    app {
      id
      identifier
      logo {
        presignedUrl
      }
    }
  }
}
    `;
export const DetailDeviceFragmentDoc = gql`
    fragment DetailDevice on Device {
  id
  name
  nodeId
  deviceId
  deviceGroups {
    ...ListDeviceGroup
  }
  clientCount
  clients(pagination: {limit: 50}) {
    ...ListClient
  }
}
    ${ListDeviceGroupFragmentDoc}
${ListClientFragmentDoc}`;
export const ListDeviceFragmentDoc = gql`
    fragment ListDevice on Device {
  id
  name
  nodeId
}
    `;
export const BrowseDeviceFragmentDoc = gql`
    fragment BrowseDevice on Device {
  id
  name
  deviceId
  deviceGroups {
    id
    name
  }
  clientCount
}
    `;
export const DeviceChipFragmentDoc = gql`
    fragment DeviceChip on Device {
  id
  name
  deviceId
}
    `;
export const ContextFragmentDoc = gql`
    fragment Context on Context {
  organization {
    id
    name
    slug
    brandHue
    brandChroma
  }
  user {
    id
    username
  }
  membership {
    id
    brandHue
    brandChroma
  }
  hub {
    id
    name
    identifier
  }
  roles
  scope
}
    `;
export const PresignedPostCredentialsFragmentDoc = gql`
    fragment PresignedPostCredentials on PresignedPostCredentials {
  xAmzAlgorithm
  xAmzCredential
  xAmzDate
  xAmzSignature
  key
  bucket
  datalayer
  policy
  store
  contentType
}
    `;
export const GroupProfileFragmentDoc = gql`
    fragment GroupProfile on GroupProfile {
  id
  name
  avatar {
    presignedUrl
  }
}
    `;
export const InstanceHealthFragmentDoc = gql`
    fragment InstanceHealth on InstanceHealth {
  healthy
  reason
  instance {
    id
    instanceId
    name
    aliases {
      id
    }
  }
}
    `;
export const HubHealthFragmentDoc = gql`
    fragment HubHealth on Hub {
  id
  name
  identifier
  version
  online
  lastSeenAt
  offlineAt
  lastHealthy
  meshConnected
  meshHost
  latestHealth {
    id
    healthy
    createdAt
    instances {
      ...InstanceHealth
    }
  }
}
    ${InstanceHealthFragmentDoc}`;
export const TeamInviteFragmentDoc = gql`
    fragment TeamInvite on Invite {
  id
  createdAt
  valid
  status
  expiresAt
  token
  inviteUrl
  roles {
    id
    identifier
  }
  acceptedBy {
    id
    username
  }
}
    `;
export const CollaborationLinkFragmentDoc = gql`
    fragment CollaborationLink on Invite {
  id
  inviteUrl
  expiresAt
  uses
  maxUses
  mesh
  valid
  collaborations {
    collaboration
    roles
  }
}
    `;
export const LayerFragmentDoc = gql`
    fragment Layer on Layer {
  id
  name
  identifier
  description
  logo {
    presignedUrl
  }
}
    `;
export const ListLayerFragmentDoc = gql`
    fragment ListLayer on Layer {
  id
  name
  identifier
  description
  logo {
    presignedUrl
  }
}
    `;
export const ListMandateFragmentDoc = gql`
    fragment ListMandate on Mandate {
  id
  label
  keyPrefix
  claimant
  origin
  agentIdentifier
  subject {
    identifier
    version
    deviceId
    scopes
  }
  attestation
  maxClients
  createdAt
  expiresAt
  revokedAt
  isLive
  grantor {
    id
    username
  }
  agentDevice {
    id
    deviceId
    name
  }
  agentUser {
    id
    username
  }
  clientCount
}
    `;
export const DetailMandateFragmentDoc = gql`
    fragment DetailMandate on Mandate {
  ...ListMandate
  clients {
    id
    clientId
    name
    node {
      id
      name
    }
  }
  hub {
    id
    name
    identifier
  }
}
    ${ListMandateFragmentDoc}`;
export const ListOrganizationFragmentDoc = gql`
    fragment ListOrganization on Organization {
  id
  name
  slug
  brandHue
  brandChroma
  avatar {
    presignedUrl
  }
}
    `;
export const MembershipFragmentDoc = gql`
    fragment Membership on Membership {
  id
  brandHue
  brandChroma
  roles {
    identifier
    id
  }
  organization {
    ...ListOrganization
  }
}
    ${ListOrganizationFragmentDoc}`;
export const TeamMemberFragmentDoc = gql`
    fragment TeamMember on Membership {
  id
  roles {
    id
    identifier
  }
  user {
    id
    username
    firstName
    lastName
    profile {
      id
      avatar {
        presignedUrl
      }
    }
  }
  createdAt
}
    `;
export const MembershipRequestFragmentDoc = gql`
    fragment MembershipRequest on MembershipRequest {
  id
  reason
  status
  createdAt
  user {
    id
    username
  }
}
    `;
export const OrganizationFragmentDoc = gql`
    fragment Organization on Organization {
  id
  name
  slug
  description
  brandHue
  brandChroma
  roles {
    id
    identifier
    description
    isAdminRole
    isDefaultRole
  }
  avatar {
    presignedUrl
  }
  profile {
    id
    bio
    avatar {
      presignedUrl
    }
  }
}
    `;
export const DetailReleaseFragmentDoc = gql`
    fragment DetailRelease on Release {
  id
  version
  logo {
    presignedUrl
  }
  app {
    ...ListApp
  }
  clientCount
  clients(pagination: {limit: 50}) {
    ...ListClient
  }
}
    ${ListAppFragmentDoc}
${ListClientFragmentDoc}`;
export const ListServiceFragmentDoc = gql`
    fragment ListService on Service {
  identifier
  id
  name
  logo {
    presignedUrl
  }
  description
}
    `;
export const ServiceFragmentDoc = gql`
    fragment Service on Service {
  identifier
  id
  name
  logo {
    presignedUrl
  }
  description
}
    `;
export const ProfileFragmentDoc = gql`
    fragment Profile on Profile {
  id
  name
  avatar {
    presignedUrl
  }
  bio
}
    `;
export const ListUserFragmentDoc = gql`
    fragment ListUser on User {
  username
  firstName
  lastName
  email
  id
  profile {
    ...Profile
  }
}
    ${ProfileFragmentDoc}`;
export const ListGroupFragmentDoc = gql`
    fragment ListGroup on Group {
  id
  name
  profile {
    id
    bio
    avatar {
      presignedUrl
    }
  }
}
    `;
export const ListServiceInstanceMappingFragmentDoc = gql`
    fragment ListServiceInstanceMapping on ServiceInstanceMapping {
  id
  key
  instance {
    id
  }
  client {
    ...ListClient
  }
  optional
}
    ${ListClientFragmentDoc}`;
export const ListInstanceAliasFragmentDoc = gql`
    fragment ListInstanceAlias on InstanceAlias {
  host
  port
  ssl
  challenge
  kind
}
    `;
export const ServiceInstanceFragmentDoc = gql`
    fragment ServiceInstance on ServiceInstance {
  release {
    version
    service {
      identifier
      id
      description
      name
    }
  }
  id
  allowedUsers {
    ...ListUser
  }
  deniedUsers {
    ...ListUser
  }
  allowedGroups {
    ...ListGroup
  }
  deniedGroups {
    ...ListGroup
  }
  mappings {
    ...ListServiceInstanceMapping
  }
  aliases {
    ...ListInstanceAlias
  }
  logo {
    presignedUrl
  }
}
    ${ListUserFragmentDoc}
${ListGroupFragmentDoc}
${ListServiceInstanceMappingFragmentDoc}
${ListInstanceAliasFragmentDoc}`;
export const ListServiceInstanceFragmentDoc = gql`
    fragment ListServiceInstance on ServiceInstance {
  id
  release {
    version
    service {
      identifier
      id
      description
      name
    }
  }
  allowedUsers {
    id
    username
  }
  deniedUsers {
    id
    username
  }
}
    `;
export const DetailUserFragmentDoc = gql`
    fragment DetailUser on User {
  id
  username
  email
  firstName
  lastName
  profile {
    ...Profile
  }
  memberships {
    id
    roles {
      id
      identifier
    }
  }
}
    ${ProfileFragmentDoc}`;
export const MeUserFragmentDoc = gql`
    fragment MeUser on User {
  id
  username
  email
  firstName
  lastName
}
    `;
export const UserChipFragmentDoc = gql`
    fragment UserChip on User {
  id
  username
  profile {
    id
    avatar {
      presignedUrl
    }
  }
}
    `;
export const CreateBugReportDocument = gql`
    mutation CreateBugReport($input: CreateBugReportInput!) {
  createBugReport(input: $input) {
    id
    title
  }
}
    `;
export type CreateBugReportMutationFn = Apollo.MutationFunction<CreateBugReportMutation, CreateBugReportMutationVariables>;

/**
 * __useCreateBugReportMutation__
 *
 * To run a mutation, you first call `useCreateBugReportMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateBugReportMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createBugReportMutation, { data, loading, error }] = useCreateBugReportMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateBugReportMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateBugReportMutation, CreateBugReportMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateBugReportMutation, CreateBugReportMutationVariables>(CreateBugReportDocument, options);
      }
export type CreateBugReportMutationHookResult = ReturnType<typeof useCreateBugReportMutation>;
export type CreateBugReportMutationResult = Apollo.MutationResult<CreateBugReportMutation>;
export type CreateBugReportMutationOptions = Apollo.BaseMutationOptions<CreateBugReportMutation, CreateBugReportMutationVariables>;
export const ResolveBugReportDocument = gql`
    mutation ResolveBugReport($input: ResolveBugReportInput!) {
  resolveBugReport(input: $input) {
    ...DetailBugReport
  }
}
    ${DetailBugReportFragmentDoc}`;
export type ResolveBugReportMutationFn = Apollo.MutationFunction<ResolveBugReportMutation, ResolveBugReportMutationVariables>;

/**
 * __useResolveBugReportMutation__
 *
 * To run a mutation, you first call `useResolveBugReportMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResolveBugReportMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resolveBugReportMutation, { data, loading, error }] = useResolveBugReportMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useResolveBugReportMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ResolveBugReportMutation, ResolveBugReportMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ResolveBugReportMutation, ResolveBugReportMutationVariables>(ResolveBugReportDocument, options);
      }
export type ResolveBugReportMutationHookResult = ReturnType<typeof useResolveBugReportMutation>;
export type ResolveBugReportMutationResult = Apollo.MutationResult<ResolveBugReportMutation>;
export type ResolveBugReportMutationOptions = Apollo.BaseMutationOptions<ResolveBugReportMutation, ResolveBugReportMutationVariables>;
export const UnresolveBugReportDocument = gql`
    mutation UnresolveBugReport($input: UnresolveBugReportInput!) {
  unresolveBugReport(input: $input) {
    ...DetailBugReport
  }
}
    ${DetailBugReportFragmentDoc}`;
export type UnresolveBugReportMutationFn = Apollo.MutationFunction<UnresolveBugReportMutation, UnresolveBugReportMutationVariables>;

/**
 * __useUnresolveBugReportMutation__
 *
 * To run a mutation, you first call `useUnresolveBugReportMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnresolveBugReportMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unresolveBugReportMutation, { data, loading, error }] = useUnresolveBugReportMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUnresolveBugReportMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UnresolveBugReportMutation, UnresolveBugReportMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UnresolveBugReportMutation, UnresolveBugReportMutationVariables>(UnresolveBugReportDocument, options);
      }
export type UnresolveBugReportMutationHookResult = ReturnType<typeof useUnresolveBugReportMutation>;
export type UnresolveBugReportMutationResult = Apollo.MutationResult<UnresolveBugReportMutation>;
export type UnresolveBugReportMutationOptions = Apollo.BaseMutationOptions<UnresolveBugReportMutation, UnresolveBugReportMutationVariables>;
export const ForwardBugReportDocument = gql`
    mutation ForwardBugReport($input: ForwardBugReportInput!) {
  forwardBugReport(input: $input) {
    ...DetailBugReport
  }
}
    ${DetailBugReportFragmentDoc}`;
export type ForwardBugReportMutationFn = Apollo.MutationFunction<ForwardBugReportMutation, ForwardBugReportMutationVariables>;

/**
 * __useForwardBugReportMutation__
 *
 * To run a mutation, you first call `useForwardBugReportMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useForwardBugReportMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [forwardBugReportMutation, { data, loading, error }] = useForwardBugReportMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useForwardBugReportMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ForwardBugReportMutation, ForwardBugReportMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ForwardBugReportMutation, ForwardBugReportMutationVariables>(ForwardBugReportDocument, options);
      }
export type ForwardBugReportMutationHookResult = ReturnType<typeof useForwardBugReportMutation>;
export type ForwardBugReportMutationResult = Apollo.MutationResult<ForwardBugReportMutation>;
export type ForwardBugReportMutationOptions = Apollo.BaseMutationOptions<ForwardBugReportMutation, ForwardBugReportMutationVariables>;
export const DeleteBugReportDocument = gql`
    mutation DeleteBugReport($input: DeleteBugReportInput!) {
  deleteBugReport(input: $input)
}
    `;
export type DeleteBugReportMutationFn = Apollo.MutationFunction<DeleteBugReportMutation, DeleteBugReportMutationVariables>;

/**
 * __useDeleteBugReportMutation__
 *
 * To run a mutation, you first call `useDeleteBugReportMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBugReportMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBugReportMutation, { data, loading, error }] = useDeleteBugReportMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeleteBugReportMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteBugReportMutation, DeleteBugReportMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteBugReportMutation, DeleteBugReportMutationVariables>(DeleteBugReportDocument, options);
      }
export type DeleteBugReportMutationHookResult = ReturnType<typeof useDeleteBugReportMutation>;
export type DeleteBugReportMutationResult = Apollo.MutationResult<DeleteBugReportMutation>;
export type DeleteBugReportMutationOptions = Apollo.BaseMutationOptions<DeleteBugReportMutation, DeleteBugReportMutationVariables>;
export const CreateCollaborationDocument = gql`
    mutation CreateCollaboration($input: CreateCollaborationInput!) {
  createCollaboration(input: $input) {
    ...Collaboration
  }
}
    ${CollaborationFragmentDoc}`;
export type CreateCollaborationMutationFn = Apollo.MutationFunction<CreateCollaborationMutation, CreateCollaborationMutationVariables>;

/**
 * __useCreateCollaborationMutation__
 *
 * To run a mutation, you first call `useCreateCollaborationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCollaborationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCollaborationMutation, { data, loading, error }] = useCreateCollaborationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCollaborationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateCollaborationMutation, CreateCollaborationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateCollaborationMutation, CreateCollaborationMutationVariables>(CreateCollaborationDocument, options);
      }
export type CreateCollaborationMutationHookResult = ReturnType<typeof useCreateCollaborationMutation>;
export type CreateCollaborationMutationResult = Apollo.MutationResult<CreateCollaborationMutation>;
export type CreateCollaborationMutationOptions = Apollo.BaseMutationOptions<CreateCollaborationMutation, CreateCollaborationMutationVariables>;
export const UpdateCollaborationDocument = gql`
    mutation UpdateCollaboration($input: UpdateCollaborationInput!) {
  updateCollaboration(input: $input) {
    ...Collaboration
  }
}
    ${CollaborationFragmentDoc}`;
export type UpdateCollaborationMutationFn = Apollo.MutationFunction<UpdateCollaborationMutation, UpdateCollaborationMutationVariables>;

/**
 * __useUpdateCollaborationMutation__
 *
 * To run a mutation, you first call `useUpdateCollaborationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCollaborationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCollaborationMutation, { data, loading, error }] = useUpdateCollaborationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCollaborationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateCollaborationMutation, UpdateCollaborationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateCollaborationMutation, UpdateCollaborationMutationVariables>(UpdateCollaborationDocument, options);
      }
export type UpdateCollaborationMutationHookResult = ReturnType<typeof useUpdateCollaborationMutation>;
export type UpdateCollaborationMutationResult = Apollo.MutationResult<UpdateCollaborationMutation>;
export type UpdateCollaborationMutationOptions = Apollo.BaseMutationOptions<UpdateCollaborationMutation, UpdateCollaborationMutationVariables>;
export const DeleteCollaborationDocument = gql`
    mutation DeleteCollaboration($id: ID!) {
  deleteCollaboration(input: {id: $id})
}
    `;
export type DeleteCollaborationMutationFn = Apollo.MutationFunction<DeleteCollaborationMutation, DeleteCollaborationMutationVariables>;

/**
 * __useDeleteCollaborationMutation__
 *
 * To run a mutation, you first call `useDeleteCollaborationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCollaborationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCollaborationMutation, { data, loading, error }] = useDeleteCollaborationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteCollaborationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteCollaborationMutation, DeleteCollaborationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteCollaborationMutation, DeleteCollaborationMutationVariables>(DeleteCollaborationDocument, options);
      }
export type DeleteCollaborationMutationHookResult = ReturnType<typeof useDeleteCollaborationMutation>;
export type DeleteCollaborationMutationResult = Apollo.MutationResult<DeleteCollaborationMutation>;
export type DeleteCollaborationMutationOptions = Apollo.BaseMutationOptions<DeleteCollaborationMutation, DeleteCollaborationMutationVariables>;
export const UpdateDeviceDocument = gql`
    mutation UpdateDevice($input: UpdateDeviceInput!) {
  updateDevice(input: $input) {
    ...DetailDevice
  }
}
    ${DetailDeviceFragmentDoc}`;
export type UpdateDeviceMutationFn = Apollo.MutationFunction<UpdateDeviceMutation, UpdateDeviceMutationVariables>;

/**
 * __useUpdateDeviceMutation__
 *
 * To run a mutation, you first call `useUpdateDeviceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateDeviceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateDeviceMutation, { data, loading, error }] = useUpdateDeviceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateDeviceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateDeviceMutation, UpdateDeviceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateDeviceMutation, UpdateDeviceMutationVariables>(UpdateDeviceDocument, options);
      }
export type UpdateDeviceMutationHookResult = ReturnType<typeof useUpdateDeviceMutation>;
export type UpdateDeviceMutationResult = Apollo.MutationResult<UpdateDeviceMutation>;
export type UpdateDeviceMutationOptions = Apollo.BaseMutationOptions<UpdateDeviceMutation, UpdateDeviceMutationVariables>;
export const CreateGroupProfileDocument = gql`
    mutation CreateGroupProfile($input: CreateGroupProfileInput!) {
  createGroupProfile(input: $input) {
    ...GroupProfile
  }
}
    ${GroupProfileFragmentDoc}`;
export type CreateGroupProfileMutationFn = Apollo.MutationFunction<CreateGroupProfileMutation, CreateGroupProfileMutationVariables>;

/**
 * __useCreateGroupProfileMutation__
 *
 * To run a mutation, you first call `useCreateGroupProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGroupProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGroupProfileMutation, { data, loading, error }] = useCreateGroupProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateGroupProfileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateGroupProfileMutation, CreateGroupProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateGroupProfileMutation, CreateGroupProfileMutationVariables>(CreateGroupProfileDocument, options);
      }
export type CreateGroupProfileMutationHookResult = ReturnType<typeof useCreateGroupProfileMutation>;
export type CreateGroupProfileMutationResult = Apollo.MutationResult<CreateGroupProfileMutation>;
export type CreateGroupProfileMutationOptions = Apollo.BaseMutationOptions<CreateGroupProfileMutation, CreateGroupProfileMutationVariables>;
export const UpdateGroupProfileDocument = gql`
    mutation UpdateGroupProfile($input: UpdateGroupProfileInput!) {
  updateGroupProfile(input: $input) {
    ...GroupProfile
  }
}
    ${GroupProfileFragmentDoc}`;
export type UpdateGroupProfileMutationFn = Apollo.MutationFunction<UpdateGroupProfileMutation, UpdateGroupProfileMutationVariables>;

/**
 * __useUpdateGroupProfileMutation__
 *
 * To run a mutation, you first call `useUpdateGroupProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGroupProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGroupProfileMutation, { data, loading, error }] = useUpdateGroupProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateGroupProfileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateGroupProfileMutation, UpdateGroupProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateGroupProfileMutation, UpdateGroupProfileMutationVariables>(UpdateGroupProfileDocument, options);
      }
export type UpdateGroupProfileMutationHookResult = ReturnType<typeof useUpdateGroupProfileMutation>;
export type UpdateGroupProfileMutationResult = Apollo.MutationResult<UpdateGroupProfileMutation>;
export type UpdateGroupProfileMutationOptions = Apollo.BaseMutationOptions<UpdateGroupProfileMutation, UpdateGroupProfileMutationVariables>;
export const UpdateServiceInstanceDocument = gql`
    mutation UpdateServiceInstance($input: UpdateServiceInstanceInput!) {
  updateServiceInstance(input: $input) {
    ...ServiceInstance
  }
}
    ${ServiceInstanceFragmentDoc}`;
export type UpdateServiceInstanceMutationFn = Apollo.MutationFunction<UpdateServiceInstanceMutation, UpdateServiceInstanceMutationVariables>;

/**
 * __useUpdateServiceInstanceMutation__
 *
 * To run a mutation, you first call `useUpdateServiceInstanceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateServiceInstanceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateServiceInstanceMutation, { data, loading, error }] = useUpdateServiceInstanceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateServiceInstanceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateServiceInstanceMutation, UpdateServiceInstanceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateServiceInstanceMutation, UpdateServiceInstanceMutationVariables>(UpdateServiceInstanceDocument, options);
      }
export type UpdateServiceInstanceMutationHookResult = ReturnType<typeof useUpdateServiceInstanceMutation>;
export type UpdateServiceInstanceMutationResult = Apollo.MutationResult<UpdateServiceInstanceMutation>;
export type UpdateServiceInstanceMutationOptions = Apollo.BaseMutationOptions<UpdateServiceInstanceMutation, UpdateServiceInstanceMutationVariables>;
export const CreateServiceInstanceDocument = gql`
    mutation CreateServiceInstance($input: CreateServiceInstanceInput!) {
  createServiceInstance(input: $input) {
    ...ServiceInstance
  }
}
    ${ServiceInstanceFragmentDoc}`;
export type CreateServiceInstanceMutationFn = Apollo.MutationFunction<CreateServiceInstanceMutation, CreateServiceInstanceMutationVariables>;

/**
 * __useCreateServiceInstanceMutation__
 *
 * To run a mutation, you first call `useCreateServiceInstanceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateServiceInstanceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createServiceInstanceMutation, { data, loading, error }] = useCreateServiceInstanceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateServiceInstanceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateServiceInstanceMutation, CreateServiceInstanceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateServiceInstanceMutation, CreateServiceInstanceMutationVariables>(CreateServiceInstanceDocument, options);
      }
export type CreateServiceInstanceMutationHookResult = ReturnType<typeof useCreateServiceInstanceMutation>;
export type CreateServiceInstanceMutationResult = Apollo.MutationResult<CreateServiceInstanceMutation>;
export type CreateServiceInstanceMutationOptions = Apollo.BaseMutationOptions<CreateServiceInstanceMutation, CreateServiceInstanceMutationVariables>;
export const CreateInviteDocument = gql`
    mutation CreateInvite($input: CreateInviteInput!) {
  createInvite(input: $input) {
    ...TeamInvite
  }
}
    ${TeamInviteFragmentDoc}`;
export type CreateInviteMutationFn = Apollo.MutationFunction<CreateInviteMutation, CreateInviteMutationVariables>;

/**
 * __useCreateInviteMutation__
 *
 * To run a mutation, you first call `useCreateInviteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateInviteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createInviteMutation, { data, loading, error }] = useCreateInviteMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateInviteMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateInviteMutation, CreateInviteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateInviteMutation, CreateInviteMutationVariables>(CreateInviteDocument, options);
      }
export type CreateInviteMutationHookResult = ReturnType<typeof useCreateInviteMutation>;
export type CreateInviteMutationResult = Apollo.MutationResult<CreateInviteMutation>;
export type CreateInviteMutationOptions = Apollo.BaseMutationOptions<CreateInviteMutation, CreateInviteMutationVariables>;
export const ShareCollaborationDocument = gql`
    mutation ShareCollaboration($input: CreateInviteInput!) {
  createInvite(input: $input) {
    ...CollaborationLink
  }
}
    ${CollaborationLinkFragmentDoc}`;
export type ShareCollaborationMutationFn = Apollo.MutationFunction<ShareCollaborationMutation, ShareCollaborationMutationVariables>;

/**
 * __useShareCollaborationMutation__
 *
 * To run a mutation, you first call `useShareCollaborationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useShareCollaborationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [shareCollaborationMutation, { data, loading, error }] = useShareCollaborationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useShareCollaborationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ShareCollaborationMutation, ShareCollaborationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ShareCollaborationMutation, ShareCollaborationMutationVariables>(ShareCollaborationDocument, options);
      }
export type ShareCollaborationMutationHookResult = ReturnType<typeof useShareCollaborationMutation>;
export type ShareCollaborationMutationResult = Apollo.MutationResult<ShareCollaborationMutation>;
export type ShareCollaborationMutationOptions = Apollo.BaseMutationOptions<ShareCollaborationMutation, ShareCollaborationMutationVariables>;
export const RevokeCollaborationLinkDocument = gql`
    mutation RevokeCollaborationLink($id: ID!) {
  cancelInvite(input: {id: $id, revokeShared: true}) {
    id
  }
}
    `;
export type RevokeCollaborationLinkMutationFn = Apollo.MutationFunction<RevokeCollaborationLinkMutation, RevokeCollaborationLinkMutationVariables>;

/**
 * __useRevokeCollaborationLinkMutation__
 *
 * To run a mutation, you first call `useRevokeCollaborationLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeCollaborationLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeCollaborationLinkMutation, { data, loading, error }] = useRevokeCollaborationLinkMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRevokeCollaborationLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeCollaborationLinkMutation, RevokeCollaborationLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeCollaborationLinkMutation, RevokeCollaborationLinkMutationVariables>(RevokeCollaborationLinkDocument, options);
      }
export type RevokeCollaborationLinkMutationHookResult = ReturnType<typeof useRevokeCollaborationLinkMutation>;
export type RevokeCollaborationLinkMutationResult = Apollo.MutationResult<RevokeCollaborationLinkMutation>;
export type RevokeCollaborationLinkMutationOptions = Apollo.BaseMutationOptions<RevokeCollaborationLinkMutation, RevokeCollaborationLinkMutationVariables>;
export const CancelInviteDocument = gql`
    mutation CancelInvite($id: ID!) {
  cancelInvite(input: {id: $id}) {
    id
    status
    valid
  }
}
    `;
export type CancelInviteMutationFn = Apollo.MutationFunction<CancelInviteMutation, CancelInviteMutationVariables>;

/**
 * __useCancelInviteMutation__
 *
 * To run a mutation, you first call `useCancelInviteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelInviteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelInviteMutation, { data, loading, error }] = useCancelInviteMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCancelInviteMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CancelInviteMutation, CancelInviteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CancelInviteMutation, CancelInviteMutationVariables>(CancelInviteDocument, options);
      }
export type CancelInviteMutationHookResult = ReturnType<typeof useCancelInviteMutation>;
export type CancelInviteMutationResult = Apollo.MutationResult<CancelInviteMutation>;
export type CancelInviteMutationOptions = Apollo.BaseMutationOptions<CancelInviteMutation, CancelInviteMutationVariables>;
export const CreateMandateDocument = gql`
    mutation CreateMandate($input: CreateMandateInput!) {
  createMandate(input: $input) {
    ...DetailMandate
  }
}
    ${DetailMandateFragmentDoc}`;
export type CreateMandateMutationFn = Apollo.MutationFunction<CreateMandateMutation, CreateMandateMutationVariables>;

/**
 * __useCreateMandateMutation__
 *
 * To run a mutation, you first call `useCreateMandateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMandateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMandateMutation, { data, loading, error }] = useCreateMandateMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMandateMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateMandateMutation, CreateMandateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateMandateMutation, CreateMandateMutationVariables>(CreateMandateDocument, options);
      }
export type CreateMandateMutationHookResult = ReturnType<typeof useCreateMandateMutation>;
export type CreateMandateMutationResult = Apollo.MutationResult<CreateMandateMutation>;
export type CreateMandateMutationOptions = Apollo.BaseMutationOptions<CreateMandateMutation, CreateMandateMutationVariables>;
export const RevokeMandateDocument = gql`
    mutation RevokeMandate($id: ID!) {
  revokeMandate(input: {id: $id}) {
    ...DetailMandate
  }
}
    ${DetailMandateFragmentDoc}`;
export type RevokeMandateMutationFn = Apollo.MutationFunction<RevokeMandateMutation, RevokeMandateMutationVariables>;

/**
 * __useRevokeMandateMutation__
 *
 * To run a mutation, you first call `useRevokeMandateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeMandateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeMandateMutation, { data, loading, error }] = useRevokeMandateMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRevokeMandateMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeMandateMutation, RevokeMandateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeMandateMutation, RevokeMandateMutationVariables>(RevokeMandateDocument, options);
      }
export type RevokeMandateMutationHookResult = ReturnType<typeof useRevokeMandateMutation>;
export type RevokeMandateMutationResult = Apollo.MutationResult<RevokeMandateMutation>;
export type RevokeMandateMutationOptions = Apollo.BaseMutationOptions<RevokeMandateMutation, RevokeMandateMutationVariables>;
export const IssueChildMandateKeyDocument = gql`
    mutation IssueChildMandateKey($input: IssueChildMandateKeyInput!) {
  issueChildMandateKey(input: $input) {
    key
    mandate {
      ...DetailMandate
    }
  }
}
    ${DetailMandateFragmentDoc}`;
export type IssueChildMandateKeyMutationFn = Apollo.MutationFunction<IssueChildMandateKeyMutation, IssueChildMandateKeyMutationVariables>;

/**
 * __useIssueChildMandateKeyMutation__
 *
 * To run a mutation, you first call `useIssueChildMandateKeyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useIssueChildMandateKeyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [issueChildMandateKeyMutation, { data, loading, error }] = useIssueChildMandateKeyMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useIssueChildMandateKeyMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<IssueChildMandateKeyMutation, IssueChildMandateKeyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<IssueChildMandateKeyMutation, IssueChildMandateKeyMutationVariables>(IssueChildMandateKeyDocument, options);
      }
export type IssueChildMandateKeyMutationHookResult = ReturnType<typeof useIssueChildMandateKeyMutation>;
export type IssueChildMandateKeyMutationResult = Apollo.MutationResult<IssueChildMandateKeyMutation>;
export type IssueChildMandateKeyMutationOptions = Apollo.BaseMutationOptions<IssueChildMandateKeyMutation, IssueChildMandateKeyMutationVariables>;
export const UpdateMembershipColorsDocument = gql`
    mutation UpdateMembershipColors($input: UpdateMembershipColorsInput!) {
  updateMembershipColors(input: $input) {
    ...Membership
  }
}
    ${MembershipFragmentDoc}`;
export type UpdateMembershipColorsMutationFn = Apollo.MutationFunction<UpdateMembershipColorsMutation, UpdateMembershipColorsMutationVariables>;

/**
 * __useUpdateMembershipColorsMutation__
 *
 * To run a mutation, you first call `useUpdateMembershipColorsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMembershipColorsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMembershipColorsMutation, { data, loading, error }] = useUpdateMembershipColorsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMembershipColorsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateMembershipColorsMutation, UpdateMembershipColorsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateMembershipColorsMutation, UpdateMembershipColorsMutationVariables>(UpdateMembershipColorsDocument, options);
      }
export type UpdateMembershipColorsMutationHookResult = ReturnType<typeof useUpdateMembershipColorsMutation>;
export type UpdateMembershipColorsMutationResult = Apollo.MutationResult<UpdateMembershipColorsMutation>;
export type UpdateMembershipColorsMutationOptions = Apollo.BaseMutationOptions<UpdateMembershipColorsMutation, UpdateMembershipColorsMutationVariables>;
export const RequestMembershipDocument = gql`
    mutation RequestMembership($input: RequestMembershipInput!) {
  requestMembership(input: $input)
}
    `;
export type RequestMembershipMutationFn = Apollo.MutationFunction<RequestMembershipMutation, RequestMembershipMutationVariables>;

/**
 * __useRequestMembershipMutation__
 *
 * To run a mutation, you first call `useRequestMembershipMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestMembershipMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestMembershipMutation, { data, loading, error }] = useRequestMembershipMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestMembershipMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestMembershipMutation, RequestMembershipMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestMembershipMutation, RequestMembershipMutationVariables>(RequestMembershipDocument, options);
      }
export type RequestMembershipMutationHookResult = ReturnType<typeof useRequestMembershipMutation>;
export type RequestMembershipMutationResult = Apollo.MutationResult<RequestMembershipMutation>;
export type RequestMembershipMutationOptions = Apollo.BaseMutationOptions<RequestMembershipMutation, RequestMembershipMutationVariables>;
export const ApproveMembershipRequestDocument = gql`
    mutation ApproveMembershipRequest($input: ApproveMembershipRequestInput!) {
  approveMembershipRequest(input: $input) {
    id
  }
}
    `;
export type ApproveMembershipRequestMutationFn = Apollo.MutationFunction<ApproveMembershipRequestMutation, ApproveMembershipRequestMutationVariables>;

/**
 * __useApproveMembershipRequestMutation__
 *
 * To run a mutation, you first call `useApproveMembershipRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveMembershipRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveMembershipRequestMutation, { data, loading, error }] = useApproveMembershipRequestMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useApproveMembershipRequestMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ApproveMembershipRequestMutation, ApproveMembershipRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ApproveMembershipRequestMutation, ApproveMembershipRequestMutationVariables>(ApproveMembershipRequestDocument, options);
      }
export type ApproveMembershipRequestMutationHookResult = ReturnType<typeof useApproveMembershipRequestMutation>;
export type ApproveMembershipRequestMutationResult = Apollo.MutationResult<ApproveMembershipRequestMutation>;
export type ApproveMembershipRequestMutationOptions = Apollo.BaseMutationOptions<ApproveMembershipRequestMutation, ApproveMembershipRequestMutationVariables>;
export const DeclineMembershipRequestDocument = gql`
    mutation DeclineMembershipRequest($input: DeclineMembershipRequestInput!) {
  declineMembershipRequest(input: $input) {
    ...MembershipRequest
  }
}
    ${MembershipRequestFragmentDoc}`;
export type DeclineMembershipRequestMutationFn = Apollo.MutationFunction<DeclineMembershipRequestMutation, DeclineMembershipRequestMutationVariables>;

/**
 * __useDeclineMembershipRequestMutation__
 *
 * To run a mutation, you first call `useDeclineMembershipRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeclineMembershipRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [declineMembershipRequestMutation, { data, loading, error }] = useDeclineMembershipRequestMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeclineMembershipRequestMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeclineMembershipRequestMutation, DeclineMembershipRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeclineMembershipRequestMutation, DeclineMembershipRequestMutationVariables>(DeclineMembershipRequestDocument, options);
      }
export type DeclineMembershipRequestMutationHookResult = ReturnType<typeof useDeclineMembershipRequestMutation>;
export type DeclineMembershipRequestMutationResult = Apollo.MutationResult<DeclineMembershipRequestMutation>;
export type DeclineMembershipRequestMutationOptions = Apollo.BaseMutationOptions<DeclineMembershipRequestMutation, DeclineMembershipRequestMutationVariables>;
export const NotifyUserDocument = gql`
    mutation NotifyUser($input: NotifyUserInput!) {
  notifyUser(input: $input)
}
    `;
export type NotifyUserMutationFn = Apollo.MutationFunction<NotifyUserMutation, NotifyUserMutationVariables>;

/**
 * __useNotifyUserMutation__
 *
 * To run a mutation, you first call `useNotifyUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useNotifyUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [notifyUserMutation, { data, loading, error }] = useNotifyUserMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useNotifyUserMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<NotifyUserMutation, NotifyUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<NotifyUserMutation, NotifyUserMutationVariables>(NotifyUserDocument, options);
      }
export type NotifyUserMutationHookResult = ReturnType<typeof useNotifyUserMutation>;
export type NotifyUserMutationResult = Apollo.MutationResult<NotifyUserMutation>;
export type NotifyUserMutationOptions = Apollo.BaseMutationOptions<NotifyUserMutation, NotifyUserMutationVariables>;
export const UpdateOrganizationDocument = gql`
    mutation UpdateOrganization($input: UpdateOrganizationInput!) {
  updateOrganization(input: $input) {
    ...Organization
  }
}
    ${OrganizationFragmentDoc}`;
export type UpdateOrganizationMutationFn = Apollo.MutationFunction<UpdateOrganizationMutation, UpdateOrganizationMutationVariables>;

/**
 * __useUpdateOrganizationMutation__
 *
 * To run a mutation, you first call `useUpdateOrganizationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateOrganizationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateOrganizationMutation, { data, loading, error }] = useUpdateOrganizationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateOrganizationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateOrganizationMutation, UpdateOrganizationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateOrganizationMutation, UpdateOrganizationMutationVariables>(UpdateOrganizationDocument, options);
      }
export type UpdateOrganizationMutationHookResult = ReturnType<typeof useUpdateOrganizationMutation>;
export type UpdateOrganizationMutationResult = Apollo.MutationResult<UpdateOrganizationMutation>;
export type UpdateOrganizationMutationOptions = Apollo.BaseMutationOptions<UpdateOrganizationMutation, UpdateOrganizationMutationVariables>;
export const CreateOrganizationDocument = gql`
    mutation CreateOrganization($input: CreateOrganizationInput!) {
  createOrganization(input: $input) {
    ...Organization
  }
}
    ${OrganizationFragmentDoc}`;
export type CreateOrganizationMutationFn = Apollo.MutationFunction<CreateOrganizationMutation, CreateOrganizationMutationVariables>;

/**
 * __useCreateOrganizationMutation__
 *
 * To run a mutation, you first call `useCreateOrganizationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateOrganizationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createOrganizationMutation, { data, loading, error }] = useCreateOrganizationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateOrganizationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateOrganizationMutation, CreateOrganizationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateOrganizationMutation, CreateOrganizationMutationVariables>(CreateOrganizationDocument, options);
      }
export type CreateOrganizationMutationHookResult = ReturnType<typeof useCreateOrganizationMutation>;
export type CreateOrganizationMutationResult = Apollo.MutationResult<CreateOrganizationMutation>;
export type CreateOrganizationMutationOptions = Apollo.BaseMutationOptions<CreateOrganizationMutation, CreateOrganizationMutationVariables>;
export const CreateUserProfileDocument = gql`
    mutation CreateUserProfile($input: CreateProfileInput!) {
  createProfile(input: $input) {
    ...Profile
  }
}
    ${ProfileFragmentDoc}`;
export type CreateUserProfileMutationFn = Apollo.MutationFunction<CreateUserProfileMutation, CreateUserProfileMutationVariables>;

/**
 * __useCreateUserProfileMutation__
 *
 * To run a mutation, you first call `useCreateUserProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUserProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUserProfileMutation, { data, loading, error }] = useCreateUserProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateUserProfileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateUserProfileMutation, CreateUserProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateUserProfileMutation, CreateUserProfileMutationVariables>(CreateUserProfileDocument, options);
      }
export type CreateUserProfileMutationHookResult = ReturnType<typeof useCreateUserProfileMutation>;
export type CreateUserProfileMutationResult = Apollo.MutationResult<CreateUserProfileMutation>;
export type CreateUserProfileMutationOptions = Apollo.BaseMutationOptions<CreateUserProfileMutation, CreateUserProfileMutationVariables>;
export const UpdateUserProfileDocument = gql`
    mutation UpdateUserProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    ...Profile
  }
}
    ${ProfileFragmentDoc}`;
export type UpdateUserProfileMutationFn = Apollo.MutationFunction<UpdateUserProfileMutation, UpdateUserProfileMutationVariables>;

/**
 * __useUpdateUserProfileMutation__
 *
 * To run a mutation, you first call `useUpdateUserProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserProfileMutation, { data, loading, error }] = useUpdateUserProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserProfileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateUserProfileMutation, UpdateUserProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateUserProfileMutation, UpdateUserProfileMutationVariables>(UpdateUserProfileDocument, options);
      }
export type UpdateUserProfileMutationHookResult = ReturnType<typeof useUpdateUserProfileMutation>;
export type UpdateUserProfileMutationResult = Apollo.MutationResult<UpdateUserProfileMutation>;
export type UpdateUserProfileMutationOptions = Apollo.BaseMutationOptions<UpdateUserProfileMutation, UpdateUserProfileMutationVariables>;
export const RequestMediaUploadDocument = gql`
    mutation RequestMediaUpload($key: String!, $datalayer: String!, $contentType: String) {
  requestMediaUpload(
    input: {key: $key, datalayer: $datalayer, contentType: $contentType}
  ) {
    ...PresignedPostCredentials
  }
}
    ${PresignedPostCredentialsFragmentDoc}`;
export type RequestMediaUploadMutationFn = Apollo.MutationFunction<RequestMediaUploadMutation, RequestMediaUploadMutationVariables>;

/**
 * __useRequestMediaUploadMutation__
 *
 * To run a mutation, you first call `useRequestMediaUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestMediaUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestMediaUploadMutation, { data, loading, error }] = useRequestMediaUploadMutation({
 *   variables: {
 *      key: // value for 'key'
 *      datalayer: // value for 'datalayer'
 *      contentType: // value for 'contentType'
 *   },
 * });
 */
export function useRequestMediaUploadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestMediaUploadMutation, RequestMediaUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestMediaUploadMutation, RequestMediaUploadMutationVariables>(RequestMediaUploadDocument, options);
      }
export type RequestMediaUploadMutationHookResult = ReturnType<typeof useRequestMediaUploadMutation>;
export type RequestMediaUploadMutationResult = Apollo.MutationResult<RequestMediaUploadMutation>;
export type RequestMediaUploadMutationOptions = Apollo.BaseMutationOptions<RequestMediaUploadMutation, RequestMediaUploadMutationVariables>;
export const AddUserToOrganizationDocument = gql`
    mutation AddUserToOrganization($input: AddUserToOrganizationInput!) {
  addUserToOrganization(input: $input) {
    id
  }
}
    `;
export type AddUserToOrganizationMutationFn = Apollo.MutationFunction<AddUserToOrganizationMutation, AddUserToOrganizationMutationVariables>;

/**
 * __useAddUserToOrganizationMutation__
 *
 * To run a mutation, you first call `useAddUserToOrganizationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddUserToOrganizationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addUserToOrganizationMutation, { data, loading, error }] = useAddUserToOrganizationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddUserToOrganizationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AddUserToOrganizationMutation, AddUserToOrganizationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AddUserToOrganizationMutation, AddUserToOrganizationMutationVariables>(AddUserToOrganizationDocument, options);
      }
export type AddUserToOrganizationMutationHookResult = ReturnType<typeof useAddUserToOrganizationMutation>;
export type AddUserToOrganizationMutationResult = Apollo.MutationResult<AddUserToOrganizationMutation>;
export type AddUserToOrganizationMutationOptions = Apollo.BaseMutationOptions<AddUserToOrganizationMutation, AddUserToOrganizationMutationVariables>;
export const AppsDocument = gql`
    query Apps($filters: AppFilter, $pagination: OffsetPaginationInput) {
  apps(filters: $filters, pagination: $pagination) {
    ...ListApp
  }
}
    ${ListAppFragmentDoc}`;

/**
 * __useAppsQuery__
 *
 * To run a query within a React component, call `useAppsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useAppsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AppsQuery, AppsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AppsQuery, AppsQueryVariables>(AppsDocument, options);
      }
export function useAppsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AppsQuery, AppsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AppsQuery, AppsQueryVariables>(AppsDocument, options);
        }
export type AppsQueryHookResult = ReturnType<typeof useAppsQuery>;
export type AppsLazyQueryHookResult = ReturnType<typeof useAppsLazyQuery>;
export type AppsQueryResult = Apollo.QueryResult<AppsQuery, AppsQueryVariables>;
export const DetailAppDocument = gql`
    query DetailApp($id: ID!) {
  app(id: $id) {
    ...DetailApp
  }
}
    ${DetailAppFragmentDoc}`;

/**
 * __useDetailAppQuery__
 *
 * To run a query within a React component, call `useDetailAppQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailAppQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailAppQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailAppQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailAppQuery, DetailAppQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailAppQuery, DetailAppQueryVariables>(DetailAppDocument, options);
      }
export function useDetailAppLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailAppQuery, DetailAppQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailAppQuery, DetailAppQueryVariables>(DetailAppDocument, options);
        }
export type DetailAppQueryHookResult = ReturnType<typeof useDetailAppQuery>;
export type DetailAppLazyQueryHookResult = ReturnType<typeof useDetailAppLazyQuery>;
export type DetailAppQueryResult = Apollo.QueryResult<DetailAppQuery, DetailAppQueryVariables>;
export const BugReportsDocument = gql`
    query BugReports($filters: BugReportFilter, $ordering: [BugReportOrdering!], $pagination: OffsetPaginationInput) {
  bugReports(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListBugReport
  }
}
    ${ListBugReportFragmentDoc}`;

/**
 * __useBugReportsQuery__
 *
 * To run a query within a React component, call `useBugReportsQuery` and pass it any options that fit your needs.
 * When your component renders, `useBugReportsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBugReportsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useBugReportsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<BugReportsQuery, BugReportsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<BugReportsQuery, BugReportsQueryVariables>(BugReportsDocument, options);
      }
export function useBugReportsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<BugReportsQuery, BugReportsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<BugReportsQuery, BugReportsQueryVariables>(BugReportsDocument, options);
        }
export type BugReportsQueryHookResult = ReturnType<typeof useBugReportsQuery>;
export type BugReportsLazyQueryHookResult = ReturnType<typeof useBugReportsLazyQuery>;
export type BugReportsQueryResult = Apollo.QueryResult<BugReportsQuery, BugReportsQueryVariables>;
export const DetailBugReportDocument = gql`
    query DetailBugReport($id: ID!) {
  bugReport(id: $id) {
    ...DetailBugReport
  }
}
    ${DetailBugReportFragmentDoc}`;

/**
 * __useDetailBugReportQuery__
 *
 * To run a query within a React component, call `useDetailBugReportQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailBugReportQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailBugReportQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailBugReportQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailBugReportQuery, DetailBugReportQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailBugReportQuery, DetailBugReportQueryVariables>(DetailBugReportDocument, options);
      }
export function useDetailBugReportLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailBugReportQuery, DetailBugReportQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailBugReportQuery, DetailBugReportQueryVariables>(DetailBugReportDocument, options);
        }
export type DetailBugReportQueryHookResult = ReturnType<typeof useDetailBugReportQuery>;
export type DetailBugReportLazyQueryHookResult = ReturnType<typeof useDetailBugReportLazyQuery>;
export type DetailBugReportQueryResult = Apollo.QueryResult<DetailBugReportQuery, DetailBugReportQueryVariables>;
export const ClientsDocument = gql`
    query Clients($filters: ClientFilter, $pagination: OffsetPaginationInput) {
  clients(filters: $filters, pagination: $pagination) {
    ...ListClient
  }
}
    ${ListClientFragmentDoc}`;

/**
 * __useClientsQuery__
 *
 * To run a query within a React component, call `useClientsQuery` and pass it any options that fit your needs.
 * When your component renders, `useClientsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClientsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useClientsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ClientsQuery, ClientsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ClientsQuery, ClientsQueryVariables>(ClientsDocument, options);
      }
export function useClientsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ClientsQuery, ClientsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ClientsQuery, ClientsQueryVariables>(ClientsDocument, options);
        }
export type ClientsQueryHookResult = ReturnType<typeof useClientsQuery>;
export type ClientsLazyQueryHookResult = ReturnType<typeof useClientsLazyQuery>;
export type ClientsQueryResult = Apollo.QueryResult<ClientsQuery, ClientsQueryVariables>;
export const DetailClientDocument = gql`
    query DetailClient($id: ID!) {
  client(id: $id) {
    ...DetailClient
  }
}
    ${DetailClientFragmentDoc}`;

/**
 * __useDetailClientQuery__
 *
 * To run a query within a React component, call `useDetailClientQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailClientQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailClientQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailClientQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailClientQuery, DetailClientQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailClientQuery, DetailClientQueryVariables>(DetailClientDocument, options);
      }
export function useDetailClientLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailClientQuery, DetailClientQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailClientQuery, DetailClientQueryVariables>(DetailClientDocument, options);
        }
export type DetailClientQueryHookResult = ReturnType<typeof useDetailClientQuery>;
export type DetailClientLazyQueryHookResult = ReturnType<typeof useDetailClientLazyQuery>;
export type DetailClientQueryResult = Apollo.QueryResult<DetailClientQuery, DetailClientQueryVariables>;
export const ClientDocument = gql`
    query Client($clientId: ID!) {
  client(clientId: $clientId) {
    ...DetailClient
  }
}
    ${DetailClientFragmentDoc}`;

/**
 * __useClientQuery__
 *
 * To run a query within a React component, call `useClientQuery` and pass it any options that fit your needs.
 * When your component renders, `useClientQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClientQuery({
 *   variables: {
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useClientQuery(baseOptions: ApolloReactHooks.QueryHookOptions<ClientQuery, ClientQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ClientQuery, ClientQueryVariables>(ClientDocument, options);
      }
export function useClientLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ClientQuery, ClientQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ClientQuery, ClientQueryVariables>(ClientDocument, options);
        }
export type ClientQueryHookResult = ReturnType<typeof useClientQuery>;
export type ClientLazyQueryHookResult = ReturnType<typeof useClientLazyQuery>;
export type ClientQueryResult = Apollo.QueryResult<ClientQuery, ClientQueryVariables>;
export const ClientChipDocument = gql`
    query ClientChip($clientId: ID!) {
  client(clientId: $clientId) {
    ...ClientChip
  }
}
    ${ClientChipFragmentDoc}`;

/**
 * __useClientChipQuery__
 *
 * To run a query within a React component, call `useClientChipQuery` and pass it any options that fit your needs.
 * When your component renders, `useClientChipQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClientChipQuery({
 *   variables: {
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useClientChipQuery(baseOptions: ApolloReactHooks.QueryHookOptions<ClientChipQuery, ClientChipQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ClientChipQuery, ClientChipQueryVariables>(ClientChipDocument, options);
      }
export function useClientChipLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ClientChipQuery, ClientChipQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ClientChipQuery, ClientChipQueryVariables>(ClientChipDocument, options);
        }
export type ClientChipQueryHookResult = ReturnType<typeof useClientChipQuery>;
export type ClientChipLazyQueryHookResult = ReturnType<typeof useClientChipLazyQuery>;
export type ClientChipQueryResult = Apollo.QueryResult<ClientChipQuery, ClientChipQueryVariables>;
export const ClientChipsDocument = gql`
    query ClientChips($clientIds: [ID!]!) {
  clientsByClientId(clientIds: $clientIds) {
    requestedId
    client {
      ...ClientChip
    }
  }
}
    ${ClientChipFragmentDoc}`;

/**
 * __useClientChipsQuery__
 *
 * To run a query within a React component, call `useClientChipsQuery` and pass it any options that fit your needs.
 * When your component renders, `useClientChipsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClientChipsQuery({
 *   variables: {
 *      clientIds: // value for 'clientIds'
 *   },
 * });
 */
export function useClientChipsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<ClientChipsQuery, ClientChipsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ClientChipsQuery, ClientChipsQueryVariables>(ClientChipsDocument, options);
      }
export function useClientChipsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ClientChipsQuery, ClientChipsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ClientChipsQuery, ClientChipsQueryVariables>(ClientChipsDocument, options);
        }
export type ClientChipsQueryHookResult = ReturnType<typeof useClientChipsQuery>;
export type ClientChipsLazyQueryHookResult = ReturnType<typeof useClientChipsLazyQuery>;
export type ClientChipsQueryResult = Apollo.QueryResult<ClientChipsQuery, ClientChipsQueryVariables>;
export const CollaborationsDocument = gql`
    query Collaborations($filters: CollaborationFilter, $pagination: OffsetPaginationInput) {
  collaborations(filters: $filters, pagination: $pagination) {
    ...Collaboration
  }
}
    ${CollaborationFragmentDoc}`;

/**
 * __useCollaborationsQuery__
 *
 * To run a query within a React component, call `useCollaborationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCollaborationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCollaborationsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useCollaborationsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<CollaborationsQuery, CollaborationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<CollaborationsQuery, CollaborationsQueryVariables>(CollaborationsDocument, options);
      }
export function useCollaborationsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<CollaborationsQuery, CollaborationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<CollaborationsQuery, CollaborationsQueryVariables>(CollaborationsDocument, options);
        }
export type CollaborationsQueryHookResult = ReturnType<typeof useCollaborationsQuery>;
export type CollaborationsLazyQueryHookResult = ReturnType<typeof useCollaborationsLazyQuery>;
export type CollaborationsQueryResult = Apollo.QueryResult<CollaborationsQuery, CollaborationsQueryVariables>;
export const GetCollaborationDocument = gql`
    query GetCollaboration($id: ID!) {
  collaboration(key: $id) {
    ...Collaboration
  }
}
    ${CollaborationFragmentDoc}`;

/**
 * __useGetCollaborationQuery__
 *
 * To run a query within a React component, call `useGetCollaborationQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCollaborationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCollaborationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetCollaborationQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetCollaborationQuery, GetCollaborationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetCollaborationQuery, GetCollaborationQueryVariables>(GetCollaborationDocument, options);
      }
export function useGetCollaborationLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetCollaborationQuery, GetCollaborationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetCollaborationQuery, GetCollaborationQueryVariables>(GetCollaborationDocument, options);
        }
export type GetCollaborationQueryHookResult = ReturnType<typeof useGetCollaborationQuery>;
export type GetCollaborationLazyQueryHookResult = ReturnType<typeof useGetCollaborationLazyQuery>;
export type GetCollaborationQueryResult = Apollo.QueryResult<GetCollaborationQuery, GetCollaborationQueryVariables>;
export const MyContextDocument = gql`
    query MyContext {
  mycontext {
    ...Context
  }
}
    ${ContextFragmentDoc}`;

/**
 * __useMyContextQuery__
 *
 * To run a query within a React component, call `useMyContextQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyContextQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyContextQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyContextQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MyContextQuery, MyContextQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyContextQuery, MyContextQueryVariables>(MyContextDocument, options);
      }
export function useMyContextLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyContextQuery, MyContextQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyContextQuery, MyContextQueryVariables>(MyContextDocument, options);
        }
export type MyContextQueryHookResult = ReturnType<typeof useMyContextQuery>;
export type MyContextLazyQueryHookResult = ReturnType<typeof useMyContextLazyQuery>;
export type MyContextQueryResult = Apollo.QueryResult<MyContextQuery, MyContextQueryVariables>;
export const IsMemberOfDocument = gql`
    query IsMemberOf($organization: ID!) {
  mycontext {
    memberOf(organization: $organization)
  }
}
    `;

/**
 * __useIsMemberOfQuery__
 *
 * To run a query within a React component, call `useIsMemberOfQuery` and pass it any options that fit your needs.
 * When your component renders, `useIsMemberOfQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useIsMemberOfQuery({
 *   variables: {
 *      organization: // value for 'organization'
 *   },
 * });
 */
export function useIsMemberOfQuery(baseOptions: ApolloReactHooks.QueryHookOptions<IsMemberOfQuery, IsMemberOfQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<IsMemberOfQuery, IsMemberOfQueryVariables>(IsMemberOfDocument, options);
      }
export function useIsMemberOfLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<IsMemberOfQuery, IsMemberOfQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<IsMemberOfQuery, IsMemberOfQueryVariables>(IsMemberOfDocument, options);
        }
export type IsMemberOfQueryHookResult = ReturnType<typeof useIsMemberOfQuery>;
export type IsMemberOfLazyQueryHookResult = ReturnType<typeof useIsMemberOfLazyQuery>;
export type IsMemberOfQueryResult = Apollo.QueryResult<IsMemberOfQuery, IsMemberOfQueryVariables>;
export const BrowseDevicesDocument = gql`
    query BrowseDevices($pagination: OffsetPaginationInput, $filters: DeviceFilter, $ordering: [DeviceOrdering!]) {
  devices(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...BrowseDevice
  }
}
    ${BrowseDeviceFragmentDoc}`;

/**
 * __useBrowseDevicesQuery__
 *
 * To run a query within a React component, call `useBrowseDevicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useBrowseDevicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBrowseDevicesQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useBrowseDevicesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<BrowseDevicesQuery, BrowseDevicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<BrowseDevicesQuery, BrowseDevicesQueryVariables>(BrowseDevicesDocument, options);
      }
export function useBrowseDevicesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<BrowseDevicesQuery, BrowseDevicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<BrowseDevicesQuery, BrowseDevicesQueryVariables>(BrowseDevicesDocument, options);
        }
export type BrowseDevicesQueryHookResult = ReturnType<typeof useBrowseDevicesQuery>;
export type BrowseDevicesLazyQueryHookResult = ReturnType<typeof useBrowseDevicesLazyQuery>;
export type BrowseDevicesQueryResult = Apollo.QueryResult<BrowseDevicesQuery, BrowseDevicesQueryVariables>;
export const DeviceFilterOptionsDocument = gql`
    query DeviceFilterOptions {
  deviceGroups {
    id
    name
  }
}
    `;

/**
 * __useDeviceFilterOptionsQuery__
 *
 * To run a query within a React component, call `useDeviceFilterOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeviceFilterOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeviceFilterOptionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useDeviceFilterOptionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<DeviceFilterOptionsQuery, DeviceFilterOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DeviceFilterOptionsQuery, DeviceFilterOptionsQueryVariables>(DeviceFilterOptionsDocument, options);
      }
export function useDeviceFilterOptionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DeviceFilterOptionsQuery, DeviceFilterOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DeviceFilterOptionsQuery, DeviceFilterOptionsQueryVariables>(DeviceFilterOptionsDocument, options);
        }
export type DeviceFilterOptionsQueryHookResult = ReturnType<typeof useDeviceFilterOptionsQuery>;
export type DeviceFilterOptionsLazyQueryHookResult = ReturnType<typeof useDeviceFilterOptionsLazyQuery>;
export type DeviceFilterOptionsQueryResult = Apollo.QueryResult<DeviceFilterOptionsQuery, DeviceFilterOptionsQueryVariables>;
export const ListDevicesDocument = gql`
    query ListDevices($pagination: OffsetPaginationInput, $filters: DeviceFilter) {
  devices(pagination: $pagination, filters: $filters) {
    ...ListDevice
  }
}
    ${ListDeviceFragmentDoc}`;

/**
 * __useListDevicesQuery__
 *
 * To run a query within a React component, call `useListDevicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListDevicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListDevicesQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useListDevicesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListDevicesQuery, ListDevicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListDevicesQuery, ListDevicesQueryVariables>(ListDevicesDocument, options);
      }
export function useListDevicesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListDevicesQuery, ListDevicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListDevicesQuery, ListDevicesQueryVariables>(ListDevicesDocument, options);
        }
export type ListDevicesQueryHookResult = ReturnType<typeof useListDevicesQuery>;
export type ListDevicesLazyQueryHookResult = ReturnType<typeof useListDevicesLazyQuery>;
export type ListDevicesQueryResult = Apollo.QueryResult<ListDevicesQuery, ListDevicesQueryVariables>;
export const GetDeviceDocument = gql`
    query GetDevice($id: ID!) {
  device(id: $id) {
    ...DetailDevice
  }
}
    ${DetailDeviceFragmentDoc}`;

/**
 * __useGetDeviceQuery__
 *
 * To run a query within a React component, call `useGetDeviceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDeviceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDeviceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetDeviceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetDeviceQuery, GetDeviceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetDeviceQuery, GetDeviceQueryVariables>(GetDeviceDocument, options);
      }
export function useGetDeviceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDeviceQuery, GetDeviceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetDeviceQuery, GetDeviceQueryVariables>(GetDeviceDocument, options);
        }
export type GetDeviceQueryHookResult = ReturnType<typeof useGetDeviceQuery>;
export type GetDeviceLazyQueryHookResult = ReturnType<typeof useGetDeviceLazyQuery>;
export type GetDeviceQueryResult = Apollo.QueryResult<GetDeviceQuery, GetDeviceQueryVariables>;
export const DeviceChipDocument = gql`
    query DeviceChip($id: ID!) {
  deviceByDeviceId(id: $id) {
    ...DeviceChip
  }
}
    ${DeviceChipFragmentDoc}`;

/**
 * __useDeviceChipQuery__
 *
 * To run a query within a React component, call `useDeviceChipQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeviceChipQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeviceChipQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeviceChipQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DeviceChipQuery, DeviceChipQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DeviceChipQuery, DeviceChipQueryVariables>(DeviceChipDocument, options);
      }
export function useDeviceChipLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DeviceChipQuery, DeviceChipQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DeviceChipQuery, DeviceChipQueryVariables>(DeviceChipDocument, options);
        }
export type DeviceChipQueryHookResult = ReturnType<typeof useDeviceChipQuery>;
export type DeviceChipLazyQueryHookResult = ReturnType<typeof useDeviceChipLazyQuery>;
export type DeviceChipQueryResult = Apollo.QueryResult<DeviceChipQuery, DeviceChipQueryVariables>;
export const DeviceChipsDocument = gql`
    query DeviceChips($deviceIds: [ID!]!, $limit: Int!) {
  devices(filters: {deviceIds: $deviceIds}, pagination: {limit: $limit}) {
    ...DeviceChip
  }
}
    ${DeviceChipFragmentDoc}`;

/**
 * __useDeviceChipsQuery__
 *
 * To run a query within a React component, call `useDeviceChipsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeviceChipsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeviceChipsQuery({
 *   variables: {
 *      deviceIds: // value for 'deviceIds'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useDeviceChipsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DeviceChipsQuery, DeviceChipsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DeviceChipsQuery, DeviceChipsQueryVariables>(DeviceChipsDocument, options);
      }
export function useDeviceChipsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DeviceChipsQuery, DeviceChipsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DeviceChipsQuery, DeviceChipsQueryVariables>(DeviceChipsDocument, options);
        }
export type DeviceChipsQueryHookResult = ReturnType<typeof useDeviceChipsQuery>;
export type DeviceChipsLazyQueryHookResult = ReturnType<typeof useDeviceChipsLazyQuery>;
export type DeviceChipsQueryResult = Apollo.QueryResult<DeviceChipsQuery, DeviceChipsQueryVariables>;
export const GroupOptionsDocument = gql`
    query GroupOptions($search: String, $values: [ID!], $limit: Int! = 20) {
  options: groups(
    filters: {search: $search, ids: $values}
    pagination: {limit: $limit}
  ) {
    value: id
    label: name
  }
}
    `;

/**
 * __useGroupOptionsQuery__
 *
 * To run a query within a React component, call `useGroupOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGroupOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGroupOptionsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGroupOptionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GroupOptionsQuery, GroupOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GroupOptionsQuery, GroupOptionsQueryVariables>(GroupOptionsDocument, options);
      }
export function useGroupOptionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GroupOptionsQuery, GroupOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GroupOptionsQuery, GroupOptionsQueryVariables>(GroupOptionsDocument, options);
        }
export type GroupOptionsQueryHookResult = ReturnType<typeof useGroupOptionsQuery>;
export type GroupOptionsLazyQueryHookResult = ReturnType<typeof useGroupOptionsLazyQuery>;
export type GroupOptionsQueryResult = Apollo.QueryResult<GroupOptionsQuery, GroupOptionsQueryVariables>;
export const MyHubHealthDocument = gql`
    query MyHubHealth {
  mycontext {
    hub {
      ...HubHealth
    }
  }
}
    ${HubHealthFragmentDoc}`;

/**
 * __useMyHubHealthQuery__
 *
 * To run a query within a React component, call `useMyHubHealthQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyHubHealthQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyHubHealthQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyHubHealthQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MyHubHealthQuery, MyHubHealthQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyHubHealthQuery, MyHubHealthQueryVariables>(MyHubHealthDocument, options);
      }
export function useMyHubHealthLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyHubHealthQuery, MyHubHealthQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyHubHealthQuery, MyHubHealthQueryVariables>(MyHubHealthDocument, options);
        }
export type MyHubHealthQueryHookResult = ReturnType<typeof useMyHubHealthQuery>;
export type MyHubHealthLazyQueryHookResult = ReturnType<typeof useMyHubHealthLazyQuery>;
export type MyHubHealthQueryResult = Apollo.QueryResult<MyHubHealthQuery, MyHubHealthQueryVariables>;
export const CollaborationLinksDocument = gql`
    query CollaborationLinks($collaboration: ID) {
  invites(filters: {collaboration: $collaboration}) {
    ...CollaborationLink
  }
}
    ${CollaborationLinkFragmentDoc}`;

/**
 * __useCollaborationLinksQuery__
 *
 * To run a query within a React component, call `useCollaborationLinksQuery` and pass it any options that fit your needs.
 * When your component renders, `useCollaborationLinksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCollaborationLinksQuery({
 *   variables: {
 *      collaboration: // value for 'collaboration'
 *   },
 * });
 */
export function useCollaborationLinksQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<CollaborationLinksQuery, CollaborationLinksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<CollaborationLinksQuery, CollaborationLinksQueryVariables>(CollaborationLinksDocument, options);
      }
export function useCollaborationLinksLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<CollaborationLinksQuery, CollaborationLinksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<CollaborationLinksQuery, CollaborationLinksQueryVariables>(CollaborationLinksDocument, options);
        }
export type CollaborationLinksQueryHookResult = ReturnType<typeof useCollaborationLinksQuery>;
export type CollaborationLinksLazyQueryHookResult = ReturnType<typeof useCollaborationLinksLazyQuery>;
export type CollaborationLinksQueryResult = Apollo.QueryResult<CollaborationLinksQuery, CollaborationLinksQueryVariables>;
export const TeamInvitesDocument = gql`
    query TeamInvites($filters: InviteFilter, $pagination: OffsetPaginationInput) {
  invites(
    filters: $filters
    pagination: $pagination
    ordering: [{createdAt: DESC}]
  ) {
    ...TeamInvite
  }
}
    ${TeamInviteFragmentDoc}`;

/**
 * __useTeamInvitesQuery__
 *
 * To run a query within a React component, call `useTeamInvitesQuery` and pass it any options that fit your needs.
 * When your component renders, `useTeamInvitesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTeamInvitesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useTeamInvitesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TeamInvitesQuery, TeamInvitesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TeamInvitesQuery, TeamInvitesQueryVariables>(TeamInvitesDocument, options);
      }
export function useTeamInvitesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TeamInvitesQuery, TeamInvitesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TeamInvitesQuery, TeamInvitesQueryVariables>(TeamInvitesDocument, options);
        }
export type TeamInvitesQueryHookResult = ReturnType<typeof useTeamInvitesQuery>;
export type TeamInvitesLazyQueryHookResult = ReturnType<typeof useTeamInvitesLazyQuery>;
export type TeamInvitesQueryResult = Apollo.QueryResult<TeamInvitesQuery, TeamInvitesQueryVariables>;
export const LayersDocument = gql`
    query Layers($filters: LayerFilter, $pagination: OffsetPaginationInput) {
  layers(filters: $filters, pagination: $pagination) {
    ...ListLayer
  }
}
    ${ListLayerFragmentDoc}`;

/**
 * __useLayersQuery__
 *
 * To run a query within a React component, call `useLayersQuery` and pass it any options that fit your needs.
 * When your component renders, `useLayersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLayersQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useLayersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<LayersQuery, LayersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<LayersQuery, LayersQueryVariables>(LayersDocument, options);
      }
export function useLayersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<LayersQuery, LayersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<LayersQuery, LayersQueryVariables>(LayersDocument, options);
        }
export type LayersQueryHookResult = ReturnType<typeof useLayersQuery>;
export type LayersLazyQueryHookResult = ReturnType<typeof useLayersLazyQuery>;
export type LayersQueryResult = Apollo.QueryResult<LayersQuery, LayersQueryVariables>;
export const DetailLayerDocument = gql`
    query DetailLayer($id: ID!) {
  layer(id: $id) {
    ...Layer
  }
}
    ${LayerFragmentDoc}`;

/**
 * __useDetailLayerQuery__
 *
 * To run a query within a React component, call `useDetailLayerQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailLayerQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailLayerQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailLayerQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailLayerQuery, DetailLayerQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailLayerQuery, DetailLayerQueryVariables>(DetailLayerDocument, options);
      }
export function useDetailLayerLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailLayerQuery, DetailLayerQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailLayerQuery, DetailLayerQueryVariables>(DetailLayerDocument, options);
        }
export type DetailLayerQueryHookResult = ReturnType<typeof useDetailLayerQuery>;
export type DetailLayerLazyQueryHookResult = ReturnType<typeof useDetailLayerLazyQuery>;
export type DetailLayerQueryResult = Apollo.QueryResult<DetailLayerQuery, DetailLayerQueryVariables>;
export const MandatesDocument = gql`
    query Mandates($filters: MandateFilter, $pagination: OffsetPaginationInput) {
  mandates(
    filters: $filters
    pagination: $pagination
    ordering: [{createdAt: DESC}]
  ) {
    ...ListMandate
  }
}
    ${ListMandateFragmentDoc}`;

/**
 * __useMandatesQuery__
 *
 * To run a query within a React component, call `useMandatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMandatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMandatesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useMandatesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MandatesQuery, MandatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MandatesQuery, MandatesQueryVariables>(MandatesDocument, options);
      }
export function useMandatesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MandatesQuery, MandatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MandatesQuery, MandatesQueryVariables>(MandatesDocument, options);
        }
export type MandatesQueryHookResult = ReturnType<typeof useMandatesQuery>;
export type MandatesLazyQueryHookResult = ReturnType<typeof useMandatesLazyQuery>;
export type MandatesQueryResult = Apollo.QueryResult<MandatesQuery, MandatesQueryVariables>;
export const GetMandateDocument = gql`
    query GetMandate($id: ID!) {
  mandate(id: $id) {
    ...DetailMandate
  }
}
    ${DetailMandateFragmentDoc}`;

/**
 * __useGetMandateQuery__
 *
 * To run a query within a React component, call `useGetMandateQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMandateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMandateQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetMandateQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetMandateQuery, GetMandateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMandateQuery, GetMandateQueryVariables>(GetMandateDocument, options);
      }
export function useGetMandateLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMandateQuery, GetMandateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMandateQuery, GetMandateQueryVariables>(GetMandateDocument, options);
        }
export type GetMandateQueryHookResult = ReturnType<typeof useGetMandateQuery>;
export type GetMandateLazyQueryHookResult = ReturnType<typeof useGetMandateLazyQuery>;
export type GetMandateQueryResult = Apollo.QueryResult<GetMandateQuery, GetMandateQueryVariables>;
export const MandateStatusesDocument = gql`
    query MandateStatuses($ids: [ID!]!, $limit: Int!) {
  mandates(filters: {ids: $ids}, pagination: {limit: $limit}) {
    id
    isLive
    expiresAt
    revokedAt
  }
}
    `;

/**
 * __useMandateStatusesQuery__
 *
 * To run a query within a React component, call `useMandateStatusesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMandateStatusesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMandateStatusesQuery({
 *   variables: {
 *      ids: // value for 'ids'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useMandateStatusesQuery(baseOptions: ApolloReactHooks.QueryHookOptions<MandateStatusesQuery, MandateStatusesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MandateStatusesQuery, MandateStatusesQueryVariables>(MandateStatusesDocument, options);
      }
export function useMandateStatusesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MandateStatusesQuery, MandateStatusesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MandateStatusesQuery, MandateStatusesQueryVariables>(MandateStatusesDocument, options);
        }
export type MandateStatusesQueryHookResult = ReturnType<typeof useMandateStatusesQuery>;
export type MandateStatusesLazyQueryHookResult = ReturnType<typeof useMandateStatusesLazyQuery>;
export type MandateStatusesQueryResult = Apollo.QueryResult<MandateStatusesQuery, MandateStatusesQueryVariables>;
export const StandingMandateDocument = gql`
    query StandingMandate($agent: AppIdentifier!, $subject: AppIdentifier!, $allowMesh: Boolean!) {
  mandates(
    filters: {live: true, claimant: AGENT, hasParent: false, agentIdentifier: $agent, subjectIdentifier: $subject, allowMesh: $allowMesh}
    pagination: {limit: 1}
  ) {
    id
  }
}
    `;

/**
 * __useStandingMandateQuery__
 *
 * To run a query within a React component, call `useStandingMandateQuery` and pass it any options that fit your needs.
 * When your component renders, `useStandingMandateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStandingMandateQuery({
 *   variables: {
 *      agent: // value for 'agent'
 *      subject: // value for 'subject'
 *      allowMesh: // value for 'allowMesh'
 *   },
 * });
 */
export function useStandingMandateQuery(baseOptions: ApolloReactHooks.QueryHookOptions<StandingMandateQuery, StandingMandateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<StandingMandateQuery, StandingMandateQueryVariables>(StandingMandateDocument, options);
      }
export function useStandingMandateLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<StandingMandateQuery, StandingMandateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<StandingMandateQuery, StandingMandateQueryVariables>(StandingMandateDocument, options);
        }
export type StandingMandateQueryHookResult = ReturnType<typeof useStandingMandateQuery>;
export type StandingMandateLazyQueryHookResult = ReturnType<typeof useStandingMandateLazyQuery>;
export type StandingMandateQueryResult = Apollo.QueryResult<StandingMandateQuery, StandingMandateQueryVariables>;
export const TeamMembersDocument = gql`
    query TeamMembers($organization: ID!, $filters: MembershipFilter, $offset: Int! = 0, $limit: Int!) {
  organization(id: $organization) {
    id
    memberships(
      filters: $filters
      pagination: {offset: $offset, limit: $limit}
      ordering: [{username: ASC}]
    ) {
      ...TeamMember
    }
  }
  membershipStats(filters: $filters) {
    count
  }
}
    ${TeamMemberFragmentDoc}`;

/**
 * __useTeamMembersQuery__
 *
 * To run a query within a React component, call `useTeamMembersQuery` and pass it any options that fit your needs.
 * When your component renders, `useTeamMembersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTeamMembersQuery({
 *   variables: {
 *      organization: // value for 'organization'
 *      filters: // value for 'filters'
 *      offset: // value for 'offset'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useTeamMembersQuery(baseOptions: ApolloReactHooks.QueryHookOptions<TeamMembersQuery, TeamMembersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TeamMembersQuery, TeamMembersQueryVariables>(TeamMembersDocument, options);
      }
export function useTeamMembersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TeamMembersQuery, TeamMembersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TeamMembersQuery, TeamMembersQueryVariables>(TeamMembersDocument, options);
        }
export type TeamMembersQueryHookResult = ReturnType<typeof useTeamMembersQuery>;
export type TeamMembersLazyQueryHookResult = ReturnType<typeof useTeamMembersLazyQuery>;
export type TeamMembersQueryResult = Apollo.QueryResult<TeamMembersQuery, TeamMembersQueryVariables>;
export const TeamCountsDocument = gql`
    query TeamCounts($admins: MembershipFilter) {
  members: membershipStats {
    count
  }
  admins: membershipStats(filters: $admins) {
    count
  }
}
    `;

/**
 * __useTeamCountsQuery__
 *
 * To run a query within a React component, call `useTeamCountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useTeamCountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTeamCountsQuery({
 *   variables: {
 *      admins: // value for 'admins'
 *   },
 * });
 */
export function useTeamCountsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TeamCountsQuery, TeamCountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TeamCountsQuery, TeamCountsQueryVariables>(TeamCountsDocument, options);
      }
export function useTeamCountsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TeamCountsQuery, TeamCountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TeamCountsQuery, TeamCountsQueryVariables>(TeamCountsDocument, options);
        }
export type TeamCountsQueryHookResult = ReturnType<typeof useTeamCountsQuery>;
export type TeamCountsLazyQueryHookResult = ReturnType<typeof useTeamCountsLazyQuery>;
export type TeamCountsQueryResult = Apollo.QueryResult<TeamCountsQuery, TeamCountsQueryVariables>;
export const NewMembersDocument = gql`
    query NewMembers($organization: ID!, $since: DateTime!, $limit: Int!) {
  organization(id: $organization) {
    id
    newMembers: memberships(
      filters: {createdAfter: $since}
      ordering: [{createdAt: DESC}]
      pagination: {limit: $limit}
    ) {
      ...TeamMember
      createdAt
    }
  }
}
    ${TeamMemberFragmentDoc}`;

/**
 * __useNewMembersQuery__
 *
 * To run a query within a React component, call `useNewMembersQuery` and pass it any options that fit your needs.
 * When your component renders, `useNewMembersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNewMembersQuery({
 *   variables: {
 *      organization: // value for 'organization'
 *      since: // value for 'since'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useNewMembersQuery(baseOptions: ApolloReactHooks.QueryHookOptions<NewMembersQuery, NewMembersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<NewMembersQuery, NewMembersQueryVariables>(NewMembersDocument, options);
      }
export function useNewMembersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<NewMembersQuery, NewMembersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<NewMembersQuery, NewMembersQueryVariables>(NewMembersDocument, options);
        }
export type NewMembersQueryHookResult = ReturnType<typeof useNewMembersQuery>;
export type NewMembersLazyQueryHookResult = ReturnType<typeof useNewMembersLazyQuery>;
export type NewMembersQueryResult = Apollo.QueryResult<NewMembersQuery, NewMembersQueryVariables>;
export const PendingMembershipRequestsDocument = gql`
    query PendingMembershipRequests {
  membershipRequests(filters: {status: [PENDING]}, ordering: [{createdAt: DESC}]) {
    ...MembershipRequest
  }
}
    ${MembershipRequestFragmentDoc}`;

/**
 * __usePendingMembershipRequestsQuery__
 *
 * To run a query within a React component, call `usePendingMembershipRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePendingMembershipRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePendingMembershipRequestsQuery({
 *   variables: {
 *   },
 * });
 */
export function usePendingMembershipRequestsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<PendingMembershipRequestsQuery, PendingMembershipRequestsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PendingMembershipRequestsQuery, PendingMembershipRequestsQueryVariables>(PendingMembershipRequestsDocument, options);
      }
export function usePendingMembershipRequestsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PendingMembershipRequestsQuery, PendingMembershipRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PendingMembershipRequestsQuery, PendingMembershipRequestsQueryVariables>(PendingMembershipRequestsDocument, options);
        }
export type PendingMembershipRequestsQueryHookResult = ReturnType<typeof usePendingMembershipRequestsQuery>;
export type PendingMembershipRequestsLazyQueryHookResult = ReturnType<typeof usePendingMembershipRequestsLazyQuery>;
export type PendingMembershipRequestsQueryResult = Apollo.QueryResult<PendingMembershipRequestsQuery, PendingMembershipRequestsQueryVariables>;
export const MyActiveMessagesDocument = gql`
    query MyActiveMessages {
  myActiveMessages {
    id
    title
    message
    action
  }
}
    `;

/**
 * __useMyActiveMessagesQuery__
 *
 * To run a query within a React component, call `useMyActiveMessagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyActiveMessagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyActiveMessagesQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyActiveMessagesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MyActiveMessagesQuery, MyActiveMessagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyActiveMessagesQuery, MyActiveMessagesQueryVariables>(MyActiveMessagesDocument, options);
      }
export function useMyActiveMessagesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyActiveMessagesQuery, MyActiveMessagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyActiveMessagesQuery, MyActiveMessagesQueryVariables>(MyActiveMessagesDocument, options);
        }
export type MyActiveMessagesQueryHookResult = ReturnType<typeof useMyActiveMessagesQuery>;
export type MyActiveMessagesLazyQueryHookResult = ReturnType<typeof useMyActiveMessagesLazyQuery>;
export type MyActiveMessagesQueryResult = Apollo.QueryResult<MyActiveMessagesQuery, MyActiveMessagesQueryVariables>;
export const OrganizationDocument = gql`
    query Organization($id: ID!) {
  organization(id: $id) {
    ...Organization
  }
}
    ${OrganizationFragmentDoc}`;

/**
 * __useOrganizationQuery__
 *
 * To run a query within a React component, call `useOrganizationQuery` and pass it any options that fit your needs.
 * When your component renders, `useOrganizationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOrganizationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useOrganizationQuery(baseOptions: ApolloReactHooks.QueryHookOptions<OrganizationQuery, OrganizationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<OrganizationQuery, OrganizationQueryVariables>(OrganizationDocument, options);
      }
export function useOrganizationLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<OrganizationQuery, OrganizationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<OrganizationQuery, OrganizationQueryVariables>(OrganizationDocument, options);
        }
export type OrganizationQueryHookResult = ReturnType<typeof useOrganizationQuery>;
export type OrganizationLazyQueryHookResult = ReturnType<typeof useOrganizationLazyQuery>;
export type OrganizationQueryResult = Apollo.QueryResult<OrganizationQuery, OrganizationQueryVariables>;
export const ReleasesDocument = gql`
    query Releases($filters: ReleaseFilter, $pagination: OffsetPaginationInput) {
  releases(filters: $filters, pagination: $pagination, ordering: [{id: DESC}]) {
    ...ListRelease
  }
}
    ${ListReleaseFragmentDoc}`;

/**
 * __useReleasesQuery__
 *
 * To run a query within a React component, call `useReleasesQuery` and pass it any options that fit your needs.
 * When your component renders, `useReleasesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReleasesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useReleasesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ReleasesQuery, ReleasesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ReleasesQuery, ReleasesQueryVariables>(ReleasesDocument, options);
      }
export function useReleasesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ReleasesQuery, ReleasesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ReleasesQuery, ReleasesQueryVariables>(ReleasesDocument, options);
        }
export type ReleasesQueryHookResult = ReturnType<typeof useReleasesQuery>;
export type ReleasesLazyQueryHookResult = ReturnType<typeof useReleasesLazyQuery>;
export type ReleasesQueryResult = Apollo.QueryResult<ReleasesQuery, ReleasesQueryVariables>;
export const DetailReleaseDocument = gql`
    query DetailRelease($id: ID!) {
  release(id: $id) {
    ...DetailRelease
  }
}
    ${DetailReleaseFragmentDoc}`;

/**
 * __useDetailReleaseQuery__
 *
 * To run a query within a React component, call `useDetailReleaseQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailReleaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailReleaseQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailReleaseQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailReleaseQuery, DetailReleaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailReleaseQuery, DetailReleaseQueryVariables>(DetailReleaseDocument, options);
      }
export function useDetailReleaseLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailReleaseQuery, DetailReleaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailReleaseQuery, DetailReleaseQueryVariables>(DetailReleaseDocument, options);
        }
export type DetailReleaseQueryHookResult = ReturnType<typeof useDetailReleaseQuery>;
export type DetailReleaseLazyQueryHookResult = ReturnType<typeof useDetailReleaseLazyQuery>;
export type DetailReleaseQueryResult = Apollo.QueryResult<DetailReleaseQuery, DetailReleaseQueryVariables>;
export const RoleOptionsDocument = gql`
    query RoleOptions($search: String, $values: [ID!]) {
  options: roles(filters: {search: $search, ids: $values}) {
    value: identifier
    label: identifier
  }
}
    `;

/**
 * __useRoleOptionsQuery__
 *
 * To run a query within a React component, call `useRoleOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useRoleOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoleOptionsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useRoleOptionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<RoleOptionsQuery, RoleOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RoleOptionsQuery, RoleOptionsQueryVariables>(RoleOptionsDocument, options);
      }
export function useRoleOptionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RoleOptionsQuery, RoleOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RoleOptionsQuery, RoleOptionsQueryVariables>(RoleOptionsDocument, options);
        }
export type RoleOptionsQueryHookResult = ReturnType<typeof useRoleOptionsQuery>;
export type RoleOptionsLazyQueryHookResult = ReturnType<typeof useRoleOptionsLazyQuery>;
export type RoleOptionsQueryResult = Apollo.QueryResult<RoleOptionsQuery, RoleOptionsQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String, $noUsers: Boolean!, $noGroups: Boolean!, $pagination: OffsetPaginationInput) {
  users: users(filters: {search: $search}, pagination: $pagination) @skip(if: $noUsers) {
    id
    username
    firstName
    lastName
  }
  groups: groups(filters: {search: $search}, pagination: $pagination) @skip(if: $noGroups) {
    id
    name
  }
}
    `;

/**
 * __useGlobalSearchQuery__
 *
 * To run a query within a React component, call `useGlobalSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useGlobalSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGlobalSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *      noUsers: // value for 'noUsers'
 *      noGroups: // value for 'noGroups'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGlobalSearchQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(GlobalSearchDocument, options);
      }
export function useGlobalSearchLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(GlobalSearchDocument, options);
        }
export type GlobalSearchQueryHookResult = ReturnType<typeof useGlobalSearchQuery>;
export type GlobalSearchLazyQueryHookResult = ReturnType<typeof useGlobalSearchLazyQuery>;
export type GlobalSearchQueryResult = Apollo.QueryResult<GlobalSearchQuery, GlobalSearchQueryVariables>;
export const ListServiceInstancesDocument = gql`
    query ListServiceInstances($pagination: OffsetPaginationInput, $filters: ServiceInstanceFilter) {
  serviceInstances(pagination: $pagination, filters: $filters) {
    ...ListServiceInstance
  }
}
    ${ListServiceInstanceFragmentDoc}`;

/**
 * __useListServiceInstancesQuery__
 *
 * To run a query within a React component, call `useListServiceInstancesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListServiceInstancesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListServiceInstancesQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useListServiceInstancesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListServiceInstancesQuery, ListServiceInstancesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListServiceInstancesQuery, ListServiceInstancesQueryVariables>(ListServiceInstancesDocument, options);
      }
export function useListServiceInstancesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListServiceInstancesQuery, ListServiceInstancesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListServiceInstancesQuery, ListServiceInstancesQueryVariables>(ListServiceInstancesDocument, options);
        }
export type ListServiceInstancesQueryHookResult = ReturnType<typeof useListServiceInstancesQuery>;
export type ListServiceInstancesLazyQueryHookResult = ReturnType<typeof useListServiceInstancesLazyQuery>;
export type ListServiceInstancesQueryResult = Apollo.QueryResult<ListServiceInstancesQuery, ListServiceInstancesQueryVariables>;
export const GetServiceInstanceDocument = gql`
    query GetServiceInstance($id: ID!) {
  serviceInstance(id: $id) {
    ...ServiceInstance
  }
}
    ${ServiceInstanceFragmentDoc}`;

/**
 * __useGetServiceInstanceQuery__
 *
 * To run a query within a React component, call `useGetServiceInstanceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetServiceInstanceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetServiceInstanceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetServiceInstanceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetServiceInstanceQuery, GetServiceInstanceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetServiceInstanceQuery, GetServiceInstanceQueryVariables>(GetServiceInstanceDocument, options);
      }
export function useGetServiceInstanceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetServiceInstanceQuery, GetServiceInstanceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetServiceInstanceQuery, GetServiceInstanceQueryVariables>(GetServiceInstanceDocument, options);
        }
export type GetServiceInstanceQueryHookResult = ReturnType<typeof useGetServiceInstanceQuery>;
export type GetServiceInstanceLazyQueryHookResult = ReturnType<typeof useGetServiceInstanceLazyQuery>;
export type GetServiceInstanceQueryResult = Apollo.QueryResult<GetServiceInstanceQuery, GetServiceInstanceQueryVariables>;
export const ListServicesDocument = gql`
    query ListServices($pagination: OffsetPaginationInput, $filters: ServiceFilter) {
  services(pagination: $pagination, filters: $filters) {
    ...ListService
  }
}
    ${ListServiceFragmentDoc}`;

/**
 * __useListServicesQuery__
 *
 * To run a query within a React component, call `useListServicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListServicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListServicesQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useListServicesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListServicesQuery, ListServicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListServicesQuery, ListServicesQueryVariables>(ListServicesDocument, options);
      }
export function useListServicesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListServicesQuery, ListServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListServicesQuery, ListServicesQueryVariables>(ListServicesDocument, options);
        }
export type ListServicesQueryHookResult = ReturnType<typeof useListServicesQuery>;
export type ListServicesLazyQueryHookResult = ReturnType<typeof useListServicesLazyQuery>;
export type ListServicesQueryResult = Apollo.QueryResult<ListServicesQuery, ListServicesQueryVariables>;
export const GetServiceDocument = gql`
    query GetService($id: ID!) {
  service(id: $id) {
    ...Service
  }
}
    ${ServiceFragmentDoc}`;

/**
 * __useGetServiceQuery__
 *
 * To run a query within a React component, call `useGetServiceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetServiceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetServiceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetServiceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetServiceQuery, GetServiceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetServiceQuery, GetServiceQueryVariables>(GetServiceDocument, options);
      }
export function useGetServiceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetServiceQuery, GetServiceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetServiceQuery, GetServiceQueryVariables>(GetServiceDocument, options);
        }
export type GetServiceQueryHookResult = ReturnType<typeof useGetServiceQuery>;
export type GetServiceLazyQueryHookResult = ReturnType<typeof useGetServiceLazyQuery>;
export type GetServiceQueryResult = Apollo.QueryResult<GetServiceQuery, GetServiceQueryVariables>;
export const UserDocument = gql`
    query User($id: ID!) {
  user(id: $id) {
    ...DetailUser
  }
}
    ${DetailUserFragmentDoc}`;

/**
 * __useUserQuery__
 *
 * To run a query within a React component, call `useUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUserQuery(baseOptions: ApolloReactHooks.QueryHookOptions<UserQuery, UserQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UserQuery, UserQueryVariables>(UserDocument, options);
      }
export function useUserLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UserQuery, UserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UserQuery, UserQueryVariables>(UserDocument, options);
        }
export type UserQueryHookResult = ReturnType<typeof useUserQuery>;
export type UserLazyQueryHookResult = ReturnType<typeof useUserLazyQuery>;
export type UserQueryResult = Apollo.QueryResult<UserQuery, UserQueryVariables>;
export const UserChipsDocument = gql`
    query UserChips($ids: [ID!]!, $limit: Int!) {
  users(filters: {ids: $ids}, pagination: {limit: $limit}) {
    ...UserChip
  }
}
    ${UserChipFragmentDoc}`;

/**
 * __useUserChipsQuery__
 *
 * To run a query within a React component, call `useUserChipsQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserChipsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserChipsQuery({
 *   variables: {
 *      ids: // value for 'ids'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useUserChipsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<UserChipsQuery, UserChipsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UserChipsQuery, UserChipsQueryVariables>(UserChipsDocument, options);
      }
export function useUserChipsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UserChipsQuery, UserChipsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UserChipsQuery, UserChipsQueryVariables>(UserChipsDocument, options);
        }
export type UserChipsQueryHookResult = ReturnType<typeof useUserChipsQuery>;
export type UserChipsLazyQueryHookResult = ReturnType<typeof useUserChipsLazyQuery>;
export type UserChipsQueryResult = Apollo.QueryResult<UserChipsQuery, UserChipsQueryVariables>;
export const UserChipDocument = gql`
    query UserChip($id: ID!) {
  user(id: $id) {
    ...UserChip
  }
}
    ${UserChipFragmentDoc}`;

/**
 * __useUserChipQuery__
 *
 * To run a query within a React component, call `useUserChipQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserChipQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserChipQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUserChipQuery(baseOptions: ApolloReactHooks.QueryHookOptions<UserChipQuery, UserChipQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UserChipQuery, UserChipQueryVariables>(UserChipDocument, options);
      }
export function useUserChipLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UserChipQuery, UserChipQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UserChipQuery, UserChipQueryVariables>(UserChipDocument, options);
        }
export type UserChipQueryHookResult = ReturnType<typeof useUserChipQuery>;
export type UserChipLazyQueryHookResult = ReturnType<typeof useUserChipLazyQuery>;
export type UserChipQueryResult = Apollo.QueryResult<UserChipQuery, UserChipQueryVariables>;
export const UsersDocument = gql`
    query Users($filters: UserFilter, $pagination: OffsetPaginationInput) {
  users(filters: $filters, pagination: $pagination) {
    ...ListUser
  }
}
    ${ListUserFragmentDoc}`;

/**
 * __useUsersQuery__
 *
 * To run a query within a React component, call `useUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsersQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useUsersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<UsersQuery, UsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
      }
export function useUsersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UsersQuery, UsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
        }
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>;
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>;
export type UsersQueryResult = Apollo.QueryResult<UsersQuery, UsersQueryVariables>;
export const UserOptionsDocument = gql`
    query UserOptions($search: String, $values: [ID!], $limit: Int! = 20) {
  options: users(
    filters: {search: $search, ids: $values}
    pagination: {limit: $limit}
  ) {
    value: id
    label: username
  }
}
    `;

/**
 * __useUserOptionsQuery__
 *
 * To run a query within a React component, call `useUserOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserOptionsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useUserOptionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<UserOptionsQuery, UserOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UserOptionsQuery, UserOptionsQueryVariables>(UserOptionsDocument, options);
      }
export function useUserOptionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UserOptionsQuery, UserOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UserOptionsQuery, UserOptionsQueryVariables>(UserOptionsDocument, options);
        }
export type UserOptionsQueryHookResult = ReturnType<typeof useUserOptionsQuery>;
export type UserOptionsLazyQueryHookResult = ReturnType<typeof useUserOptionsLazyQuery>;
export type UserOptionsQueryResult = Apollo.QueryResult<UserOptionsQuery, UserOptionsQueryVariables>;
export const ProfileDocument = gql`
    query Profile {
  me {
    ...MeUser
  }
}
    ${MeUserFragmentDoc}`;

/**
 * __useProfileQuery__
 *
 * To run a query within a React component, call `useProfileQuery` and pass it any options that fit your needs.
 * When your component renders, `useProfileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProfileQuery({
 *   variables: {
 *   },
 * });
 */
export function useProfileQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ProfileQuery, ProfileQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
      }
export function useProfileLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ProfileQuery, ProfileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
        }
export type ProfileQueryHookResult = ReturnType<typeof useProfileQuery>;
export type ProfileLazyQueryHookResult = ReturnType<typeof useProfileLazyQuery>;
export type ProfileQueryResult = Apollo.QueryResult<ProfileQuery, ProfileQueryVariables>;
export const WatchMyMessagesDocument = gql`
    subscription WatchMyMessages {
  myMessages {
    create {
      id
    }
    update {
      id
    }
    delete
  }
}
    `;

/**
 * __useWatchMyMessagesSubscription__
 *
 * To run a query within a React component, call `useWatchMyMessagesSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchMyMessagesSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchMyMessagesSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchMyMessagesSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<WatchMyMessagesSubscription, WatchMyMessagesSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<WatchMyMessagesSubscription, WatchMyMessagesSubscriptionVariables>(WatchMyMessagesDocument, options);
      }
export type WatchMyMessagesSubscriptionHookResult = ReturnType<typeof useWatchMyMessagesSubscription>;
export type WatchMyMessagesSubscriptionResult = Apollo.SubscriptionResult<WatchMyMessagesSubscription>;
export const WatchMembershipRequestsDocument = gql`
    subscription WatchMembershipRequests {
  membershipRequests {
    create {
      ...MembershipRequest
    }
    update {
      ...MembershipRequest
    }
  }
}
    ${MembershipRequestFragmentDoc}`;

/**
 * __useWatchMembershipRequestsSubscription__
 *
 * To run a query within a React component, call `useWatchMembershipRequestsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchMembershipRequestsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchMembershipRequestsSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchMembershipRequestsSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<WatchMembershipRequestsSubscription, WatchMembershipRequestsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<WatchMembershipRequestsSubscription, WatchMembershipRequestsSubscriptionVariables>(WatchMembershipRequestsDocument, options);
      }
export type WatchMembershipRequestsSubscriptionHookResult = ReturnType<typeof useWatchMembershipRequestsSubscription>;
export type WatchMembershipRequestsSubscriptionResult = Apollo.SubscriptionResult<WatchMembershipRequestsSubscription>;
export const WatchHubHealthDocument = gql`
    subscription WatchHubHealth($hub: ID) {
  hubHealth(hub: $hub) {
    ...HubHealth
  }
}
    ${HubHealthFragmentDoc}`;

/**
 * __useWatchHubHealthSubscription__
 *
 * To run a query within a React component, call `useWatchHubHealthSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchHubHealthSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchHubHealthSubscription({
 *   variables: {
 *      hub: // value for 'hub'
 *   },
 * });
 */
export function useWatchHubHealthSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<WatchHubHealthSubscription, WatchHubHealthSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<WatchHubHealthSubscription, WatchHubHealthSubscriptionVariables>(WatchHubHealthDocument, options);
      }
export type WatchHubHealthSubscriptionHookResult = ReturnType<typeof useWatchHubHealthSubscription>;
export type WatchHubHealthSubscriptionResult = Apollo.SubscriptionResult<WatchHubHealthSubscription>;