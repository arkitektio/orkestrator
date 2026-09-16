import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lib/lok/hooks';
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
  /** The releases of the app. A release is a version of the app that can be installed by a user. */
  releases: Array<Release>;
};


/** An App is the Arkitekt equivalent of a Software Application. It is a collection of `Releases` that can be all part of the same application. E.g the App `Napari` could have the releases `0.1.0` and `0.2.0`. */
export type AppReleasesArgs = {
  ordering?: Array<ReleaseOrdering>;
};

/** App(id, name, identifier, organization, logo) */
export type AppFilter = {
  AND?: InputMaybe<AppFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AppFilter>;
  OR?: InputMaybe<AppFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type AppOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type CancelInviteInput = {
  id: Scalars['ID']['input'];
};

/**
 * A client is a way of authenticating users with a release.
 *  The strategy of authentication is defined by the kind of client. And allows for different authentication flow.
 *  E.g a client can be a DESKTOP app, that might be used by multiple users, or a WEBSITE that wants to connect to a user's account,
 *  but also a DEVELOPMENT client that is used by a developer to test the app. The client model thinly wraps the oauth2 client model, which is used to authenticate users.
 */
export type Client = {
  __typename?: 'Client';
  /** The OAuth2 client id this client authenticates as. */
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

/** A Communication */
export type Communication = {
  __typename?: 'Communication';
  channel: Scalars['ID']['output'];
};

export type Context = {
  __typename?: 'Context';
  /** Are we acting in the active organization of the user? */
  fitsActiveOrganization: Scalars['Boolean']['output'];
  /** The organization that is associated with this app */
  organization: Organization;
  /** The roles that the user has in the organization */
  roles: Array<Scalars['String']['output']>;
  /** The scope of the app within in the organization */
  scope: Array<Scalars['String']['output']>;
  /** The user that is associated with this app */
  user: User;
};

export type CreateGroupProfileInput = {
  avatar: Scalars['ID']['input'];
  group: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CreateInviteInput = {
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  organization?: InputMaybe<Scalars['ID']['input']>;
  roles?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type DeleteRedeemTokenInput = {
  id: Scalars['ID']['input'];
};

export type DevelopmentClientInput = {
  hub?: InputMaybe<Scalars['ID']['input']>;
  layers?: InputMaybe<Array<Scalars['String']['input']>>;
  manifest: ManifestInput;
  role?: InputMaybe<ClientRole>;
};

/** Device(id, node_id, name, organization) */
export type Device = {
  __typename?: 'Device';
  clients: Array<Client>;
  /** The device groups that belong to this device. */
  deviceGroups: Array<DeviceGroup>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
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

/** An alias for a service instance. This is used to provide a more user-friendly name for the instance. */
export type InstanceAlias = {
  __typename?: 'InstanceAlias';
  /** The challenge of the alias. This is used to verify that the alias is reachable. If set, the alias will be accessed via the challenge URL (e.g. 'example.com/.well-known/challenge'). If not set, the alias will be accessed via the instance's URL. */
  challenge: Scalars['String']['output'];
  /** The host of the alias, if its a ABSOLUTE alias (e.g. 'example.com'). If not set, the alias is relative to the layer's domain. */
  host?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The instance that this alias belongs to. */
  instance: ServiceInstance;
  /** The kind of alias. If relative, the alias is resolved against the layer's domain/port/path; if absolute, it is a full URL. */
  kind: Scalars['String']['output'];
  /** The layer that this alias belongs to, if any. */
  layer?: Maybe<Layer>;
  /** The path of the alias, if its a ABSOLUTE alias (e.g. 'example.com/path'). If not set, the alias is relative to the layer's path. */
  path?: Maybe<Scalars['String']['output']>;
  /** The port of the alias, if its a ABSOLUTE alias (e.g. 'example.com:8080'). If not set, the alias is relative to the layer's port. */
  port?: Maybe<Scalars['Int']['output']>;
  /** Is this alias publicly reachable? If true, the coordination server can also check the alias's health directly, enabling health checks from the kontrol interface. */
  public: Scalars['Boolean']['output'];
  /** Is this alias using SSL? If true, the alias will be accessed via https:// instead of http://. This is used to indicate that the alias is secure and should be accessed via SSL */
  ssl: Scalars['Boolean']['output'];
};

export type InstanceAliasOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/** A single-use magic invite link that allows one person to join an organization. */
export type Invite = {
  __typename?: 'Invite';
  acceptedBy?: Maybe<User>;
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
  respondedAt?: Maybe<Scalars['DateTime']['output']>;
  roles: Array<Role>;
  status: Scalars['String']['output'];
  token: Scalars['String']['output'];
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

/** Invite(id, token, email, created_by, created_for, created_at, expires_at, public, status, accepted_by, declined_by, responded_at) */
export type InviteFilter = {
  AND?: InputMaybe<InviteFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<InviteFilter>;
  OR?: InputMaybe<InviteFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type InviteOrdering =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

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

export type ManifestInput = {
  authors?: Array<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  homepage?: InputMaybe<Scalars['String']['input']>;
  identifier: Scalars['String']['input'];
  keywords?: Array<Scalars['String']['input']>;
  license?: InputMaybe<Scalars['String']['input']>;
  logo?: InputMaybe<Scalars['String']['input']>;
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

/** __doc__ */
export type MembershipFilter = {
  AND?: InputMaybe<MembershipFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MembershipFilter>;
  OR?: InputMaybe<MembershipFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type MembershipOrdering =
  { id: Ordering; };

export type Mutation = {
  __typename?: 'Mutation';
  acceptInvite: Membership;
  acknowledgeMessage: SystemMessage;
  addUserToOrganization: Membership;
  cancelInvite: Invite;
  createDevelopmentalClient: Client;
  createGroupProfile: GroupProfile;
  createInvite: Invite;
  createOrganization: Organization;
  createProfile: Profile;
  createRedeemToken: RedeemToken;
  createServiceInstance: ServiceInstance;
  declineInvite: Invite;
  deleteRedeemToken: Scalars['ID']['output'];
  notifyUser: Scalars['Boolean']['output'];
  registerComChannel: ComChannel;
  render: Scalars['Fakt']['output'];
  requestMediaUpload: PresignedPostCredentials;
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


export type MutationCancelInviteArgs = {
  input: CancelInviteInput;
};


export type MutationCreateDevelopmentalClientArgs = {
  input: DevelopmentClientInput;
};


export type MutationCreateGroupProfileArgs = {
  input: CreateGroupProfileInput;
};


export type MutationCreateInviteArgs = {
  input: CreateInviteInput;
};


export type MutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


export type MutationCreateProfileArgs = {
  input: CreateProfileInput;
};


export type MutationCreateRedeemTokenArgs = {
  input: RedeemTokenInput;
};


export type MutationCreateServiceInstanceArgs = {
  input: CreateServiceInstanceInput;
};


export type MutationDeclineInviteArgs = {
  input: DeclineInviteInput;
};


export type MutationDeleteRedeemTokenArgs = {
  input: DeleteRedeemTokenInput;
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
  /** The logo of the organization */
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
  /** the memberships of people */
  memberships: Array<Membership>;
  /** The name of this organization */
  name: Scalars['String']['output'];
  profile: OrganizationProfile;
  /** The roles that are available in the organization */
  roles: Array<Role>;
  slug: Scalars['String']['output'];
  /** The users that are part of the organization */
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
  client: Client;
  clients: Array<Client>;
  device: Device;
  /** Look a device up by its raw device id, as reported by the client. Device ids are stored as a per-organization hash, so the raw id is hashed with the caller's organization before lookup. */
  deviceByDeviceId: Device;
  deviceGroup: DeviceGroup;
  deviceGroups: Array<DeviceGroup>;
  devices: Array<Device>;
  group: Group;
  groups: Array<Group>;
  hallo: Scalars['String']['output'];
  invites: Array<Invite>;
  layer: Layer;
  layers: Array<Layer>;
  me: User;
  message: SystemMessage;
  myActiveMessages: Array<SystemMessage>;
  myManagedClients: Array<Client>;
  myRedeemTokens: Array<RedeemToken>;
  mycontext: Context;
  mygroups: Array<Group>;
  organization: Organization;
  organizations: Array<Organization>;
  redeemToken: RedeemToken;
  redeemTokens: Array<RedeemToken>;
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


export type QueryClientArgs = {
  clientId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  ordering?: Array<ClientOrdering>;
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


export type QueryRedeemTokenArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRedeemTokensArgs = {
  filters?: InputMaybe<RedeemTokenFilter>;
  ordering?: Array<RedeemTokenOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryReleaseArgs = {
  clientId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  identifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
  version?: InputMaybe<Scalars['Version']['input']>;
};


export type QueryReleasesArgs = {
  ordering?: Array<ReleaseOrdering>;
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

/**
 * A redeem token is a token that can be used to redeem the rights to create
 * a client. It is used to give the recipient the right to create a client.
 *
 * If the token is not redeemed within the expires_at time, it will be invalid.
 * If the token has been redeemed, but the manifest has changed, the token will be invalid.
 */
export type RedeemToken = {
  __typename?: 'RedeemToken';
  /** The client that this redeem token belongs to. */
  client?: Maybe<Client>;
  /** When this token stops being redeemable. Null means never. */
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** How many times this token may be redeemed. Null means unlimited. */
  maxRedemptions?: Maybe<Scalars['Int']['output']>;
  /** The manifest this token was pre-authorized for at mint time, or null for an unpinned token. A redeem must match its identifier, version and node_id exactly and may only request a subset of its scopes and requirements. */
  pinnedManifest?: Maybe<Scalars['JSON']['output']>;
  /** How many times this token has been redeemed so far. */
  redemptionCount: Scalars['Int']['output'];
  /** The token of the redeem token */
  token: Scalars['String']['output'];
  /** The user that this redeem token belongs to. */
  user: User;
};

/**
 * A redeem token is a token that can be used to redeem the rights to create
 * a client. It is used to give the recipient the right to create a client.
 *
 * If the token is not redeemed within the expires_at time, it will be invalid.
 * If the token has been redeemed, but the manifest has changed, the token will be invalid.
 */
export type RedeemTokenFilter = {
  AND?: InputMaybe<RedeemTokenFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RedeemTokenFilter>;
  OR?: InputMaybe<RedeemTokenFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type RedeemTokenInput = {
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  manifest: ManifestInput;
  maxRedemptions?: InputMaybe<Scalars['Int']['input']>;
  token?: InputMaybe<Scalars['String']['input']>;
};

export type RedeemTokenOrdering =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export type RegisterComChannelInput = {
  token: Scalars['String']['input'];
};

/** A Release is a version of an app. Releases might change over time. E.g. a release might be updated to fix a bug, and the release might be updated to add a new feature. This is why they are the home for `scopes` and `requirements`, which might change over the release cycle. */
export type Release = {
  __typename?: 'Release';
  /** The app that this release belongs to. */
  app: App;
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
  datalayer: Scalars['String']['input'];
  key: Scalars['String']['input'];
};

export type RequirementInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  optional?: Scalars['Boolean']['input'];
  service: Scalars['String']['input'];
};

/** A Role is a set of permissions that can be assigned to a user. It is used to define what a user can do in the system. */
export type Role = {
  __typename?: 'Role';
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
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
  /** The aliases of the instance. An alias is a way to reach the instance. Clients can use these aliases to check if they can reach the instance. An alias can be an absolute alias (e.g. 'example.com') or a relative alias (e.g. 'example.com/path'). If the alias is relative, it will be relative to the layer's domain, port and path. */
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

/** ServiceInstance(id, hub, release, logo, instance_id, private_key, steward, organization, device, template, public_key, token) */
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
  communications: Communication;
};


export type SubscriptionCommunicationsArgs = {
  channels: Array<Scalars['ID']['input']>;
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

export type InstanceAliasFragment = { __typename?: 'InstanceAlias', host?: string | null, port?: number | null, ssl: boolean, challenge: string, kind: string };

export type ListInstanceAliasFragment = { __typename?: 'InstanceAlias', host?: string | null, port?: number | null, ssl: boolean, challenge: string, kind: string };

export type DetailAppFragment = { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, releases: Array<(
    { __typename?: 'Release' }
    & ListReleaseFragment
  )> };

export type ListAppFragment = { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type DetailClientFragment = { __typename?: 'Client', id: string, clientId: string, name: string, public: boolean, kind: ClientKind, role: ClientRole, issueUrl?: string | null, user?: { __typename?: 'User', id: string, username: string } | null, release?: (
    { __typename?: 'Release' }
    & ListReleaseFragment
  ) | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, node?: { __typename?: 'Device', id: string, name?: string | null } | null, publicSources: Array<{ __typename?: 'PublicSource', kind: string, url: string }> };

export type ListClientFragment = { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, node?: { __typename?: 'Device', id: string, name?: string | null } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null };

export type DetailDeviceFragment = { __typename?: 'Device', id: string, name?: string | null, nodeId: string, deviceGroups: Array<(
    { __typename?: 'DeviceGroup' }
    & ListDeviceGroupFragment
  )> };

export type ListDeviceFragment = { __typename?: 'Device', id: string, name?: string | null, nodeId: string };

export type ContextFragment = { __typename?: 'Context', roles: Array<string>, scope: Array<string>, organization: { __typename?: 'Organization', id: string, name: string, slug: string, brandHue?: number | null, brandChroma?: number | null }, user: { __typename?: 'User', id: string, username: string, memberships: Array<{ __typename?: 'Membership', id: string, brandHue?: number | null, brandChroma?: number | null, organization: { __typename?: 'Organization', id: string } }> } };

export type PresignedPostCredentialsFragment = { __typename?: 'PresignedPostCredentials', xAmzAlgorithm: string, xAmzCredential: string, xAmzDate: string, xAmzSignature: string, key: string, bucket: string, datalayer: string, policy: string, store: string };

export type DetailDeviceGroupFragment = { __typename?: 'DeviceGroup', id: string, name: string, devices: Array<(
    { __typename?: 'Device' }
    & ListDeviceFragment
  )> };

export type ListDeviceGroupFragment = { __typename?: 'DeviceGroup', id: string, name: string };

export type DetailGroupFragment = { __typename?: 'Group', id: string, name: string, users: Array<(
    { __typename?: 'User' }
    & ListUserFragment
  )>, profile?: (
    { __typename?: 'GroupProfile' }
    & GroupProfileFragment
  ) | null };

export type ListGroupFragment = { __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null };

export type GroupProfileFragment = { __typename?: 'GroupProfile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ListInviteFragment = { __typename?: 'Invite', id: string, token: string, status: string, createdAt: any, expiresAt?: any | null, createdBy: { __typename?: 'User', id: string, username: string }, createdFor: (
    { __typename?: 'Organization' }
    & ListOrganizationFragment
  ) };

export type InviteFragment = { __typename?: 'Invite', id: string, token: string, status: string, createdAt: any, expiresAt?: any | null, createdBy: { __typename?: 'User', id: string, username: string, profile: { __typename?: 'Profile', id: string, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } }, createdFor: (
    { __typename?: 'Organization' }
    & OrganizationFragment
  ), acceptedBy?: { __typename?: 'User', id: string, username: string, profile: { __typename?: 'Profile', id: string, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null };

export type LayerFragment = { __typename?: 'Layer', id: string, name: string, identifier: any, description?: string | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ListLayerFragment = { __typename?: 'Layer', id: string, name: string, identifier: any, description?: string | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type MembershipFragment = { __typename?: 'Membership', id: string, brandHue?: number | null, brandChroma?: number | null, roles: Array<{ __typename?: 'Role', identifier: string, id: string }>, organization: (
    { __typename?: 'Organization' }
    & ListOrganizationFragment
  ) };

export type OrganizationFragment = { __typename?: 'Organization', id: string, name: string, slug: string, brandHue?: number | null, brandChroma?: number | null, roles: Array<{ __typename?: 'Role', id: string, identifier: string, description: string }>, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null, memberships: Array<{ __typename?: 'Membership', id: string, roles: Array<{ __typename?: 'Role', identifier: string }>, user: { __typename?: 'User', id: string, username: string, profile: { __typename?: 'Profile', id: string, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } } }>, invites: Array<{ __typename?: 'Invite', status: string, expiresAt?: any | null, token: string, inviteUrl: string, acceptedBy?: { __typename?: 'User', id: string, username: string, profile: { __typename?: 'Profile', id: string, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null }> };

export type ListOrganizationFragment = { __typename?: 'Organization', id: string, name: string, slug: string, brandHue?: number | null, brandChroma?: number | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ProfileFragment = { __typename?: 'Profile', id: string, name?: string | null, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ListRedeemTokenFragment = { __typename?: 'RedeemToken', id: string, token: string, user: { __typename?: 'User', id: string, email?: string | null }, client?: { __typename?: 'Client', id: string, name: string, release?: { __typename?: 'Release', version: any, app: { __typename?: 'App', identifier: any } } | null } | null };

export type DetailRedeemTokenFragment = (
  { __typename?: 'RedeemToken' }
  & ListRedeemTokenFragment
);

export type DetailReleaseFragment = { __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: (
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

export type RoleFragment = { __typename?: 'Role', id: string, identifier: string, description: string };

export type ListRoleFragment = { __typename?: 'Role', id: string, identifier: string, description: string };

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

export type ListServiceInstanceFragment = { __typename?: 'ServiceInstance', id: string, release: { __typename?: 'ServiceRelease', version: string, service: { __typename?: 'Service', identifier: any, id: string, description?: string | null, name: string } }, allowedUsers: Array<(
    { __typename?: 'User' }
    & ListUserFragment
  )>, deniedUsers: Array<(
    { __typename?: 'User' }
    & ListUserFragment
  )> };

export type ListServiceInstanceMappingFragment = { __typename?: 'ServiceInstanceMapping', id: string, key: string, optional: boolean, instance: (
    { __typename?: 'ServiceInstance' }
    & ListServiceInstanceFragment
  ), client: (
    { __typename?: 'Client' }
    & ListClientFragment
  ) };

export type ListUserFragment = { __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string, profile: (
    { __typename?: 'Profile' }
    & ProfileFragment
  ) };

export type DetailUserFragment = { __typename?: 'User', id: string, username: string, email?: string | null, firstName?: string | null, lastName?: string | null, avatar?: string | null, groups: Array<{ __typename?: 'Group', id: string, name: string }>, profile: (
    { __typename?: 'Profile' }
    & ProfileFragment
  ), memberships: Array<(
    { __typename?: 'Membership' }
    & MembershipFragment
  )> };

export type MeUserFragment = { __typename?: 'User', id: string, username: string, email?: string | null, firstName?: string | null, lastName?: string | null, avatar?: string | null };

export type CreateClientMutationVariables = Exact<{
  identifier: Scalars['String']['input'];
  version: Scalars['String']['input'];
  scopes: Array<Scalars['String']['input']> | Scalars['String']['input'];
  logo?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateClientMutation = { __typename?: 'Mutation', createDevelopmentalClient: { __typename?: 'Client', id: string } };

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
    & InviteFragment
  ) };

export type UpdateMembershipColorsMutationVariables = Exact<{
  input: UpdateMembershipColorsInput;
}>;


export type UpdateMembershipColorsMutation = { __typename?: 'Mutation', updateMembershipColors: (
    { __typename?: 'Membership' }
    & MembershipFragment
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

export type CreateRedeemTokenMutationVariables = Exact<{
  input: RedeemTokenInput;
}>;


export type CreateRedeemTokenMutation = { __typename?: 'Mutation', createRedeemToken: { __typename?: 'RedeemToken', id: string, token: string } };

export type RequestMediaUploadMutationVariables = Exact<{
  key: Scalars['String']['input'];
  datalayer: Scalars['String']['input'];
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

export type AppQueryVariables = Exact<{
  identifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  clientId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type AppQuery = { __typename?: 'Query', app: (
    { __typename?: 'App' }
    & DetailAppFragment
  ) };

export type DetailAppQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailAppQuery = { __typename?: 'Query', app: (
    { __typename?: 'App' }
    & DetailAppFragment
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

export type MyManagedClientsQueryVariables = Exact<{
  kind: ClientKind;
}>;


export type MyManagedClientsQuery = { __typename?: 'Query', myManagedClients: Array<(
    { __typename?: 'Client' }
    & ListClientFragment
  )> };

export type ClientQueryVariables = Exact<{
  clientId: Scalars['ID']['input'];
}>;


export type ClientQuery = { __typename?: 'Query', client: (
    { __typename?: 'Client' }
    & DetailClientFragment
  ) };

export type MyContextQueryVariables = Exact<{ [key: string]: never; }>;


export type MyContextQuery = { __typename?: 'Query', mycontext: (
    { __typename?: 'Context' }
    & ContextFragment
  ) };

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

export type GetDeviceByDeviceIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDeviceByDeviceIdQuery = { __typename?: 'Query', deviceByDeviceId: (
    { __typename?: 'Device' }
    & DetailDeviceFragment
  ) };

export type ListDeviceGroupQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<DeviceGroupFilter>;
}>;


export type ListDeviceGroupQuery = { __typename?: 'Query', deviceGroups: Array<(
    { __typename?: 'DeviceGroup' }
    & ListDeviceGroupFragment
  )> };

export type GetDeviceGroupQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDeviceGroupQuery = { __typename?: 'Query', deviceGroup: (
    { __typename?: 'DeviceGroup' }
    & DetailDeviceGroupFragment
  ) };

export type GroupOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type GroupOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Group', value: string, label: string }> };

export type DetailGroupQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailGroupQuery = { __typename?: 'Query', group: (
    { __typename?: 'Group' }
    & DetailGroupFragment
  ) };

export type GroupsQueryVariables = Exact<{
  filters?: InputMaybe<GroupFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GroupsQuery = { __typename?: 'Query', groups: Array<(
    { __typename?: 'Group' }
    & ListGroupFragment
  )> };

export type HomePageStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type HomePageStatsQuery = { __typename?: 'Query', userStats: { __typename?: 'UserStats', count: number } };

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

export type MyActiveMessagesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyActiveMessagesQuery = { __typename?: 'Query', myActiveMessages: Array<{ __typename?: 'SystemMessage', id: string, title?: string | null, message?: string | null, action: string }> };

export type OrganizationQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type OrganizationQuery = { __typename?: 'Query', organization: (
    { __typename?: 'Organization' }
    & OrganizationFragment
  ) };

export type ListOrganizationsQueryVariables = Exact<{
  filters?: InputMaybe<OrganizationFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListOrganizationsQuery = { __typename?: 'Query', organizations: Array<(
    { __typename?: 'Organization' }
    & ListOrganizationFragment
  )> };

export type OrganizationOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type OrganizationOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Organization', value: string, label: string }> };

export type RedeemTokensQueryVariables = Exact<{
  filters?: InputMaybe<RedeemTokenFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type RedeemTokensQuery = { __typename?: 'Query', redeemTokens: Array<(
    { __typename?: 'RedeemToken' }
    & ListRedeemTokenFragment
  )> };

export type GetRedeemTokenQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetRedeemTokenQuery = { __typename?: 'Query', redeemToken: (
    { __typename?: 'RedeemToken' }
    & DetailRedeemTokenFragment
  ) };

export type ReleasesQueryVariables = Exact<{ [key: string]: never; }>;


export type ReleasesQuery = { __typename?: 'Query', releases: Array<(
    { __typename?: 'Release' }
    & ListReleaseFragment
  )> };

export type ReleaseQueryVariables = Exact<{
  identifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
  version?: InputMaybe<Scalars['Version']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  clientId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ReleaseQuery = { __typename?: 'Query', release: (
    { __typename?: 'Release' }
    & DetailReleaseFragment
  ) };

export type DetailReleaseQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailReleaseQuery = { __typename?: 'Query', release: (
    { __typename?: 'Release' }
    & DetailReleaseFragment
  ) };

export type RoleQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RoleQuery = { __typename?: 'Query', role: (
    { __typename?: 'Role' }
    & RoleFragment
  ) };

export type ListRolesQueryVariables = Exact<{
  filters?: InputMaybe<RoleFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListRolesQuery = { __typename?: 'Query', roles: Array<(
    { __typename?: 'Role' }
    & ListRoleFragment
  )> };

export type RoleOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type RoleOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Role', value: string, label: string }> };

export type ScopesQueryVariables = Exact<{ [key: string]: never; }>;


export type ScopesQuery = { __typename?: 'Query', scopes: Array<{ __typename?: 'Scope', description: string, value: string, label: string }> };

export type ScopesOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ScopesOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Scope', value: string, label: string }> };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  noUsers: Scalars['Boolean']['input'];
  noGroups: Scalars['Boolean']['input'];
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', users?: Array<(
    { __typename?: 'User' }
    & ListUserFragment
  )>, groups?: Array<(
    { __typename?: 'Group' }
    & ListGroupFragment
  )> };

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

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: (
    { __typename?: 'User' }
    & DetailUserFragment
  ) };

export type UserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserQuery = { __typename?: 'Query', user: (
    { __typename?: 'User' }
    & DetailUserFragment
  ) };

export type DetailUserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailUserQuery = { __typename?: 'Query', user: (
    { __typename?: 'User' }
    & DetailUserFragment
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
}>;


export type UserOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'User', value: string, label: string }> };

export type ProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfileQuery = { __typename?: 'Query', me: (
    { __typename?: 'User' }
    & MeUserFragment
  ) };

export const InstanceAliasFragmentDoc = gql`
    fragment InstanceAlias on InstanceAlias {
  host
  port
  ssl
  challenge
  kind
}
    `;
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
  releases {
    ...ListRelease
  }
}
    ${ListReleaseFragmentDoc}`;
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
export const ListDeviceGroupFragmentDoc = gql`
    fragment ListDeviceGroup on DeviceGroup {
  id
  name
}
    `;
export const DetailDeviceFragmentDoc = gql`
    fragment DetailDevice on Device {
  id
  name
  nodeId
  deviceGroups {
    ...ListDeviceGroup
  }
}
    ${ListDeviceGroupFragmentDoc}`;
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
    memberships {
      id
      brandHue
      brandChroma
      organization {
        id
      }
    }
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
}
    `;
export const ListDeviceFragmentDoc = gql`
    fragment ListDevice on Device {
  id
  name
  nodeId
}
    `;
export const DetailDeviceGroupFragmentDoc = gql`
    fragment DetailDeviceGroup on DeviceGroup {
  id
  name
  devices {
    ...ListDevice
  }
}
    ${ListDeviceFragmentDoc}`;
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
  avatar
  id
  profile {
    ...Profile
  }
}
    ${ProfileFragmentDoc}`;
export const GroupProfileFragmentDoc = gql`
    fragment GroupProfile on GroupProfile {
  id
  name
  avatar {
    presignedUrl
  }
}
    `;
export const DetailGroupFragmentDoc = gql`
    fragment DetailGroup on Group {
  id
  name
  users {
    ...ListUser
  }
  profile {
    ...GroupProfile
  }
}
    ${ListUserFragmentDoc}
${GroupProfileFragmentDoc}`;
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
export const ListInviteFragmentDoc = gql`
    fragment ListInvite on Invite {
  id
  token
  createdBy {
    id
    username
  }
  createdFor {
    ...ListOrganization
  }
  status
  createdAt
  expiresAt
}
    ${ListOrganizationFragmentDoc}`;
export const OrganizationFragmentDoc = gql`
    fragment Organization on Organization {
  id
  name
  slug
  brandHue
  brandChroma
  roles {
    id
    identifier
    description
  }
  avatar {
    presignedUrl
  }
  memberships {
    id
    roles {
      identifier
    }
    user {
      id
      username
      profile {
        id
        avatar {
          presignedUrl
        }
      }
    }
  }
  invites {
    acceptedBy {
      id
      username
      profile {
        id
        avatar {
          presignedUrl
        }
      }
    }
    status
    expiresAt
    token
    inviteUrl
  }
}
    `;
export const InviteFragmentDoc = gql`
    fragment Invite on Invite {
  id
  token
  createdBy {
    id
    username
    profile {
      id
      avatar {
        presignedUrl
      }
    }
  }
  createdFor {
    ...Organization
  }
  acceptedBy {
    id
    username
    profile {
      id
      avatar {
        presignedUrl
      }
    }
  }
  status
  createdAt
  expiresAt
}
    ${OrganizationFragmentDoc}`;
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
export const ListRedeemTokenFragmentDoc = gql`
    fragment ListRedeemToken on RedeemToken {
  id
  token
  user {
    id
    email
  }
  client {
    id
    name
    release {
      version
      app {
        identifier
      }
    }
  }
}
    `;
export const DetailRedeemTokenFragmentDoc = gql`
    fragment DetailRedeemToken on RedeemToken {
  ...ListRedeemToken
}
    ${ListRedeemTokenFragmentDoc}`;
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
  clients {
    ...ListClient
  }
}
    ${ListAppFragmentDoc}
${ListClientFragmentDoc}`;
export const RoleFragmentDoc = gql`
    fragment Role on Role {
  id
  identifier
  description
}
    `;
export const ListRoleFragmentDoc = gql`
    fragment ListRole on Role {
  id
  identifier
  description
}
    `;
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
    ...ListUser
  }
  deniedUsers {
    ...ListUser
  }
}
    ${ListUserFragmentDoc}`;
export const ListServiceInstanceMappingFragmentDoc = gql`
    fragment ListServiceInstanceMapping on ServiceInstanceMapping {
  id
  key
  instance {
    ...ListServiceInstance
  }
  client {
    ...ListClient
  }
  optional
}
    ${ListServiceInstanceFragmentDoc}
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
export const DetailUserFragmentDoc = gql`
    fragment DetailUser on User {
  id
  username
  email
  firstName
  lastName
  avatar
  groups {
    id
    name
  }
  profile {
    ...Profile
  }
  memberships {
    ...Membership
  }
}
    ${ProfileFragmentDoc}
${MembershipFragmentDoc}`;
export const MeUserFragmentDoc = gql`
    fragment MeUser on User {
  id
  username
  email
  firstName
  lastName
  avatar
}
    `;
export const CreateClientDocument = gql`
    mutation CreateClient($identifier: String!, $version: String!, $scopes: [String!]!, $logo: String) {
  createDevelopmentalClient(
    input: {manifest: {identifier: $identifier, version: $version, scopes: $scopes, logo: $logo}}
  ) {
    id
  }
}
    `;
export type CreateClientMutationFn = Apollo.MutationFunction<CreateClientMutation, CreateClientMutationVariables>;

/**
 * __useCreateClientMutation__
 *
 * To run a mutation, you first call `useCreateClientMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateClientMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createClientMutation, { data, loading, error }] = useCreateClientMutation({
 *   variables: {
 *      identifier: // value for 'identifier'
 *      version: // value for 'version'
 *      scopes: // value for 'scopes'
 *      logo: // value for 'logo'
 *   },
 * });
 */
export function useCreateClientMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateClientMutation, CreateClientMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateClientMutation, CreateClientMutationVariables>(CreateClientDocument, options);
      }
export type CreateClientMutationHookResult = ReturnType<typeof useCreateClientMutation>;
export type CreateClientMutationResult = Apollo.MutationResult<CreateClientMutation>;
export type CreateClientMutationOptions = Apollo.BaseMutationOptions<CreateClientMutation, CreateClientMutationVariables>;
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
    ...Invite
  }
}
    ${InviteFragmentDoc}`;
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
export const CreateRedeemTokenDocument = gql`
    mutation CreateRedeemToken($input: RedeemTokenInput!) {
  createRedeemToken(input: $input) {
    id
    token
  }
}
    `;
export type CreateRedeemTokenMutationFn = Apollo.MutationFunction<CreateRedeemTokenMutation, CreateRedeemTokenMutationVariables>;

/**
 * __useCreateRedeemTokenMutation__
 *
 * To run a mutation, you first call `useCreateRedeemTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateRedeemTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRedeemTokenMutation, { data, loading, error }] = useCreateRedeemTokenMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateRedeemTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateRedeemTokenMutation, CreateRedeemTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateRedeemTokenMutation, CreateRedeemTokenMutationVariables>(CreateRedeemTokenDocument, options);
      }
export type CreateRedeemTokenMutationHookResult = ReturnType<typeof useCreateRedeemTokenMutation>;
export type CreateRedeemTokenMutationResult = Apollo.MutationResult<CreateRedeemTokenMutation>;
export type CreateRedeemTokenMutationOptions = Apollo.BaseMutationOptions<CreateRedeemTokenMutation, CreateRedeemTokenMutationVariables>;
export const RequestMediaUploadDocument = gql`
    mutation RequestMediaUpload($key: String!, $datalayer: String!) {
  requestMediaUpload(input: {key: $key, datalayer: $datalayer}) {
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
export const AppDocument = gql`
    query App($identifier: AppIdentifier, $id: ID, $clientId: ID) {
  app(identifier: $identifier, id: $id, clientId: $clientId) {
    ...DetailApp
  }
}
    ${DetailAppFragmentDoc}`;

/**
 * __useAppQuery__
 *
 * To run a query within a React component, call `useAppQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppQuery({
 *   variables: {
 *      identifier: // value for 'identifier'
 *      id: // value for 'id'
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useAppQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AppQuery, AppQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AppQuery, AppQueryVariables>(AppDocument, options);
      }
export function useAppLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AppQuery, AppQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AppQuery, AppQueryVariables>(AppDocument, options);
        }
export type AppQueryHookResult = ReturnType<typeof useAppQuery>;
export type AppLazyQueryHookResult = ReturnType<typeof useAppLazyQuery>;
export type AppQueryResult = Apollo.QueryResult<AppQuery, AppQueryVariables>;
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
export const MyManagedClientsDocument = gql`
    query MyManagedClients($kind: ClientKind!) {
  myManagedClients(kind: $kind) {
    ...ListClient
  }
}
    ${ListClientFragmentDoc}`;

/**
 * __useMyManagedClientsQuery__
 *
 * To run a query within a React component, call `useMyManagedClientsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyManagedClientsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyManagedClientsQuery({
 *   variables: {
 *      kind: // value for 'kind'
 *   },
 * });
 */
export function useMyManagedClientsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<MyManagedClientsQuery, MyManagedClientsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyManagedClientsQuery, MyManagedClientsQueryVariables>(MyManagedClientsDocument, options);
      }
export function useMyManagedClientsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyManagedClientsQuery, MyManagedClientsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyManagedClientsQuery, MyManagedClientsQueryVariables>(MyManagedClientsDocument, options);
        }
export type MyManagedClientsQueryHookResult = ReturnType<typeof useMyManagedClientsQuery>;
export type MyManagedClientsLazyQueryHookResult = ReturnType<typeof useMyManagedClientsLazyQuery>;
export type MyManagedClientsQueryResult = Apollo.QueryResult<MyManagedClientsQuery, MyManagedClientsQueryVariables>;
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
export const GetDeviceByDeviceIdDocument = gql`
    query GetDeviceByDeviceId($id: ID!) {
  deviceByDeviceId(id: $id) {
    ...DetailDevice
  }
}
    ${DetailDeviceFragmentDoc}`;

/**
 * __useGetDeviceByDeviceIdQuery__
 *
 * To run a query within a React component, call `useGetDeviceByDeviceIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDeviceByDeviceIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDeviceByDeviceIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetDeviceByDeviceIdQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetDeviceByDeviceIdQuery, GetDeviceByDeviceIdQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetDeviceByDeviceIdQuery, GetDeviceByDeviceIdQueryVariables>(GetDeviceByDeviceIdDocument, options);
      }
export function useGetDeviceByDeviceIdLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDeviceByDeviceIdQuery, GetDeviceByDeviceIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetDeviceByDeviceIdQuery, GetDeviceByDeviceIdQueryVariables>(GetDeviceByDeviceIdDocument, options);
        }
export type GetDeviceByDeviceIdQueryHookResult = ReturnType<typeof useGetDeviceByDeviceIdQuery>;
export type GetDeviceByDeviceIdLazyQueryHookResult = ReturnType<typeof useGetDeviceByDeviceIdLazyQuery>;
export type GetDeviceByDeviceIdQueryResult = Apollo.QueryResult<GetDeviceByDeviceIdQuery, GetDeviceByDeviceIdQueryVariables>;
export const ListDeviceGroupDocument = gql`
    query ListDeviceGroup($pagination: OffsetPaginationInput, $filters: DeviceGroupFilter) {
  deviceGroups(pagination: $pagination, filters: $filters) {
    ...ListDeviceGroup
  }
}
    ${ListDeviceGroupFragmentDoc}`;

/**
 * __useListDeviceGroupQuery__
 *
 * To run a query within a React component, call `useListDeviceGroupQuery` and pass it any options that fit your needs.
 * When your component renders, `useListDeviceGroupQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListDeviceGroupQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useListDeviceGroupQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListDeviceGroupQuery, ListDeviceGroupQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListDeviceGroupQuery, ListDeviceGroupQueryVariables>(ListDeviceGroupDocument, options);
      }
export function useListDeviceGroupLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListDeviceGroupQuery, ListDeviceGroupQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListDeviceGroupQuery, ListDeviceGroupQueryVariables>(ListDeviceGroupDocument, options);
        }
export type ListDeviceGroupQueryHookResult = ReturnType<typeof useListDeviceGroupQuery>;
export type ListDeviceGroupLazyQueryHookResult = ReturnType<typeof useListDeviceGroupLazyQuery>;
export type ListDeviceGroupQueryResult = Apollo.QueryResult<ListDeviceGroupQuery, ListDeviceGroupQueryVariables>;
export const GetDeviceGroupDocument = gql`
    query GetDeviceGroup($id: ID!) {
  deviceGroup(id: $id) {
    ...DetailDeviceGroup
  }
}
    ${DetailDeviceGroupFragmentDoc}`;

/**
 * __useGetDeviceGroupQuery__
 *
 * To run a query within a React component, call `useGetDeviceGroupQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDeviceGroupQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDeviceGroupQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetDeviceGroupQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetDeviceGroupQuery, GetDeviceGroupQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetDeviceGroupQuery, GetDeviceGroupQueryVariables>(GetDeviceGroupDocument, options);
      }
export function useGetDeviceGroupLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDeviceGroupQuery, GetDeviceGroupQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetDeviceGroupQuery, GetDeviceGroupQueryVariables>(GetDeviceGroupDocument, options);
        }
export type GetDeviceGroupQueryHookResult = ReturnType<typeof useGetDeviceGroupQuery>;
export type GetDeviceGroupLazyQueryHookResult = ReturnType<typeof useGetDeviceGroupLazyQuery>;
export type GetDeviceGroupQueryResult = Apollo.QueryResult<GetDeviceGroupQuery, GetDeviceGroupQueryVariables>;
export const GroupOptionsDocument = gql`
    query GroupOptions($search: String, $values: [ID!]) {
  options: groups(filters: {search: $search, ids: $values}) {
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
export const DetailGroupDocument = gql`
    query DetailGroup($id: ID!) {
  group(id: $id) {
    ...DetailGroup
  }
}
    ${DetailGroupFragmentDoc}`;

/**
 * __useDetailGroupQuery__
 *
 * To run a query within a React component, call `useDetailGroupQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailGroupQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailGroupQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailGroupQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailGroupQuery, DetailGroupQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailGroupQuery, DetailGroupQueryVariables>(DetailGroupDocument, options);
      }
export function useDetailGroupLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailGroupQuery, DetailGroupQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailGroupQuery, DetailGroupQueryVariables>(DetailGroupDocument, options);
        }
export type DetailGroupQueryHookResult = ReturnType<typeof useDetailGroupQuery>;
export type DetailGroupLazyQueryHookResult = ReturnType<typeof useDetailGroupLazyQuery>;
export type DetailGroupQueryResult = Apollo.QueryResult<DetailGroupQuery, DetailGroupQueryVariables>;
export const GroupsDocument = gql`
    query Groups($filters: GroupFilter, $pagination: OffsetPaginationInput) {
  groups(filters: $filters, pagination: $pagination) {
    ...ListGroup
  }
}
    ${ListGroupFragmentDoc}`;

/**
 * __useGroupsQuery__
 *
 * To run a query within a React component, call `useGroupsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGroupsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGroupsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGroupsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GroupsQuery, GroupsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GroupsQuery, GroupsQueryVariables>(GroupsDocument, options);
      }
export function useGroupsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GroupsQuery, GroupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GroupsQuery, GroupsQueryVariables>(GroupsDocument, options);
        }
export type GroupsQueryHookResult = ReturnType<typeof useGroupsQuery>;
export type GroupsLazyQueryHookResult = ReturnType<typeof useGroupsLazyQuery>;
export type GroupsQueryResult = Apollo.QueryResult<GroupsQuery, GroupsQueryVariables>;
export const HomePageStatsDocument = gql`
    query HomePageStats {
  userStats {
    count
  }
}
    `;

/**
 * __useHomePageStatsQuery__
 *
 * To run a query within a React component, call `useHomePageStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useHomePageStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHomePageStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useHomePageStatsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<HomePageStatsQuery, HomePageStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<HomePageStatsQuery, HomePageStatsQueryVariables>(HomePageStatsDocument, options);
      }
export function useHomePageStatsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<HomePageStatsQuery, HomePageStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<HomePageStatsQuery, HomePageStatsQueryVariables>(HomePageStatsDocument, options);
        }
export type HomePageStatsQueryHookResult = ReturnType<typeof useHomePageStatsQuery>;
export type HomePageStatsLazyQueryHookResult = ReturnType<typeof useHomePageStatsLazyQuery>;
export type HomePageStatsQueryResult = Apollo.QueryResult<HomePageStatsQuery, HomePageStatsQueryVariables>;
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
export const ListOrganizationsDocument = gql`
    query ListOrganizations($filters: OrganizationFilter, $pagination: OffsetPaginationInput) {
  organizations(filters: $filters, pagination: $pagination) {
    ...ListOrganization
  }
}
    ${ListOrganizationFragmentDoc}`;

/**
 * __useListOrganizationsQuery__
 *
 * To run a query within a React component, call `useListOrganizationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListOrganizationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListOrganizationsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListOrganizationsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListOrganizationsQuery, ListOrganizationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListOrganizationsQuery, ListOrganizationsQueryVariables>(ListOrganizationsDocument, options);
      }
export function useListOrganizationsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListOrganizationsQuery, ListOrganizationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListOrganizationsQuery, ListOrganizationsQueryVariables>(ListOrganizationsDocument, options);
        }
export type ListOrganizationsQueryHookResult = ReturnType<typeof useListOrganizationsQuery>;
export type ListOrganizationsLazyQueryHookResult = ReturnType<typeof useListOrganizationsLazyQuery>;
export type ListOrganizationsQueryResult = Apollo.QueryResult<ListOrganizationsQuery, ListOrganizationsQueryVariables>;
export const OrganizationOptionsDocument = gql`
    query OrganizationOptions($search: String, $values: [ID!]) {
  options: organizations(filters: {search: $search, ids: $values}) {
    value: id
    label: name
  }
}
    `;

/**
 * __useOrganizationOptionsQuery__
 *
 * To run a query within a React component, call `useOrganizationOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useOrganizationOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOrganizationOptionsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useOrganizationOptionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<OrganizationOptionsQuery, OrganizationOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<OrganizationOptionsQuery, OrganizationOptionsQueryVariables>(OrganizationOptionsDocument, options);
      }
export function useOrganizationOptionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<OrganizationOptionsQuery, OrganizationOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<OrganizationOptionsQuery, OrganizationOptionsQueryVariables>(OrganizationOptionsDocument, options);
        }
export type OrganizationOptionsQueryHookResult = ReturnType<typeof useOrganizationOptionsQuery>;
export type OrganizationOptionsLazyQueryHookResult = ReturnType<typeof useOrganizationOptionsLazyQuery>;
export type OrganizationOptionsQueryResult = Apollo.QueryResult<OrganizationOptionsQuery, OrganizationOptionsQueryVariables>;
export const RedeemTokensDocument = gql`
    query RedeemTokens($filters: RedeemTokenFilter, $pagination: OffsetPaginationInput) {
  redeemTokens(filters: $filters, pagination: $pagination) {
    ...ListRedeemToken
  }
}
    ${ListRedeemTokenFragmentDoc}`;

/**
 * __useRedeemTokensQuery__
 *
 * To run a query within a React component, call `useRedeemTokensQuery` and pass it any options that fit your needs.
 * When your component renders, `useRedeemTokensQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRedeemTokensQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useRedeemTokensQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<RedeemTokensQuery, RedeemTokensQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RedeemTokensQuery, RedeemTokensQueryVariables>(RedeemTokensDocument, options);
      }
export function useRedeemTokensLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RedeemTokensQuery, RedeemTokensQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RedeemTokensQuery, RedeemTokensQueryVariables>(RedeemTokensDocument, options);
        }
export type RedeemTokensQueryHookResult = ReturnType<typeof useRedeemTokensQuery>;
export type RedeemTokensLazyQueryHookResult = ReturnType<typeof useRedeemTokensLazyQuery>;
export type RedeemTokensQueryResult = Apollo.QueryResult<RedeemTokensQuery, RedeemTokensQueryVariables>;
export const GetRedeemTokenDocument = gql`
    query GetRedeemToken($id: ID!) {
  redeemToken(id: $id) {
    ...DetailRedeemToken
  }
}
    ${DetailRedeemTokenFragmentDoc}`;

/**
 * __useGetRedeemTokenQuery__
 *
 * To run a query within a React component, call `useGetRedeemTokenQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRedeemTokenQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRedeemTokenQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetRedeemTokenQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetRedeemTokenQuery, GetRedeemTokenQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetRedeemTokenQuery, GetRedeemTokenQueryVariables>(GetRedeemTokenDocument, options);
      }
export function useGetRedeemTokenLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetRedeemTokenQuery, GetRedeemTokenQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetRedeemTokenQuery, GetRedeemTokenQueryVariables>(GetRedeemTokenDocument, options);
        }
export type GetRedeemTokenQueryHookResult = ReturnType<typeof useGetRedeemTokenQuery>;
export type GetRedeemTokenLazyQueryHookResult = ReturnType<typeof useGetRedeemTokenLazyQuery>;
export type GetRedeemTokenQueryResult = Apollo.QueryResult<GetRedeemTokenQuery, GetRedeemTokenQueryVariables>;
export const ReleasesDocument = gql`
    query Releases {
  releases {
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
export const ReleaseDocument = gql`
    query Release($identifier: AppIdentifier, $version: Version, $id: ID, $clientId: ID) {
  release(
    identifier: $identifier
    version: $version
    id: $id
    clientId: $clientId
  ) {
    ...DetailRelease
  }
}
    ${DetailReleaseFragmentDoc}`;

/**
 * __useReleaseQuery__
 *
 * To run a query within a React component, call `useReleaseQuery` and pass it any options that fit your needs.
 * When your component renders, `useReleaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReleaseQuery({
 *   variables: {
 *      identifier: // value for 'identifier'
 *      version: // value for 'version'
 *      id: // value for 'id'
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useReleaseQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ReleaseQuery, ReleaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ReleaseQuery, ReleaseQueryVariables>(ReleaseDocument, options);
      }
export function useReleaseLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ReleaseQuery, ReleaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ReleaseQuery, ReleaseQueryVariables>(ReleaseDocument, options);
        }
export type ReleaseQueryHookResult = ReturnType<typeof useReleaseQuery>;
export type ReleaseLazyQueryHookResult = ReturnType<typeof useReleaseLazyQuery>;
export type ReleaseQueryResult = Apollo.QueryResult<ReleaseQuery, ReleaseQueryVariables>;
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
export const RoleDocument = gql`
    query Role($id: ID!) {
  role(id: $id) {
    ...Role
  }
}
    ${RoleFragmentDoc}`;

/**
 * __useRoleQuery__
 *
 * To run a query within a React component, call `useRoleQuery` and pass it any options that fit your needs.
 * When your component renders, `useRoleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoleQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRoleQuery(baseOptions: ApolloReactHooks.QueryHookOptions<RoleQuery, RoleQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RoleQuery, RoleQueryVariables>(RoleDocument, options);
      }
export function useRoleLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RoleQuery, RoleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RoleQuery, RoleQueryVariables>(RoleDocument, options);
        }
export type RoleQueryHookResult = ReturnType<typeof useRoleQuery>;
export type RoleLazyQueryHookResult = ReturnType<typeof useRoleLazyQuery>;
export type RoleQueryResult = Apollo.QueryResult<RoleQuery, RoleQueryVariables>;
export const ListRolesDocument = gql`
    query ListRoles($filters: RoleFilter, $pagination: OffsetPaginationInput) {
  roles(filters: $filters, pagination: $pagination) {
    ...ListRole
  }
}
    ${ListRoleFragmentDoc}`;

/**
 * __useListRolesQuery__
 *
 * To run a query within a React component, call `useListRolesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListRolesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListRolesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListRolesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListRolesQuery, ListRolesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListRolesQuery, ListRolesQueryVariables>(ListRolesDocument, options);
      }
export function useListRolesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListRolesQuery, ListRolesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListRolesQuery, ListRolesQueryVariables>(ListRolesDocument, options);
        }
export type ListRolesQueryHookResult = ReturnType<typeof useListRolesQuery>;
export type ListRolesLazyQueryHookResult = ReturnType<typeof useListRolesLazyQuery>;
export type ListRolesQueryResult = Apollo.QueryResult<ListRolesQuery, ListRolesQueryVariables>;
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
export const ScopesDocument = gql`
    query Scopes {
  scopes {
    description
    value
    label
  }
}
    `;

/**
 * __useScopesQuery__
 *
 * To run a query within a React component, call `useScopesQuery` and pass it any options that fit your needs.
 * When your component renders, `useScopesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useScopesQuery({
 *   variables: {
 *   },
 * });
 */
export function useScopesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ScopesQuery, ScopesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ScopesQuery, ScopesQueryVariables>(ScopesDocument, options);
      }
export function useScopesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ScopesQuery, ScopesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ScopesQuery, ScopesQueryVariables>(ScopesDocument, options);
        }
export type ScopesQueryHookResult = ReturnType<typeof useScopesQuery>;
export type ScopesLazyQueryHookResult = ReturnType<typeof useScopesLazyQuery>;
export type ScopesQueryResult = Apollo.QueryResult<ScopesQuery, ScopesQueryVariables>;
export const ScopesOptionsDocument = gql`
    query ScopesOptions {
  options: scopes {
    value
    label
  }
}
    `;

/**
 * __useScopesOptionsQuery__
 *
 * To run a query within a React component, call `useScopesOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useScopesOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useScopesOptionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useScopesOptionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ScopesOptionsQuery, ScopesOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ScopesOptionsQuery, ScopesOptionsQueryVariables>(ScopesOptionsDocument, options);
      }
export function useScopesOptionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ScopesOptionsQuery, ScopesOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ScopesOptionsQuery, ScopesOptionsQueryVariables>(ScopesOptionsDocument, options);
        }
export type ScopesOptionsQueryHookResult = ReturnType<typeof useScopesOptionsQuery>;
export type ScopesOptionsLazyQueryHookResult = ReturnType<typeof useScopesOptionsLazyQuery>;
export type ScopesOptionsQueryResult = Apollo.QueryResult<ScopesOptionsQuery, ScopesOptionsQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String, $noUsers: Boolean!, $noGroups: Boolean!, $pagination: OffsetPaginationInput) {
  users: users(filters: {search: $search}, pagination: $pagination) @skip(if: $noUsers) {
    ...ListUser
  }
  groups: groups(filters: {search: $search}, pagination: $pagination) @skip(if: $noGroups) {
    ...ListGroup
  }
}
    ${ListUserFragmentDoc}
${ListGroupFragmentDoc}`;

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
export const MeDocument = gql`
    query Me {
  me {
    ...DetailUser
  }
}
    ${DetailUserFragmentDoc}`;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
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
export const DetailUserDocument = gql`
    query DetailUser($id: ID!) {
  user(id: $id) {
    ...DetailUser
  }
}
    ${DetailUserFragmentDoc}`;

/**
 * __useDetailUserQuery__
 *
 * To run a query within a React component, call `useDetailUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailUserQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailUserQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailUserQuery, DetailUserQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailUserQuery, DetailUserQueryVariables>(DetailUserDocument, options);
      }
export function useDetailUserLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailUserQuery, DetailUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailUserQuery, DetailUserQueryVariables>(DetailUserDocument, options);
        }
export type DetailUserQueryHookResult = ReturnType<typeof useDetailUserQuery>;
export type DetailUserLazyQueryHookResult = ReturnType<typeof useDetailUserLazyQuery>;
export type DetailUserQueryResult = Apollo.QueryResult<DetailUserQuery, DetailUserQueryVariables>;
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
    query UserOptions($search: String, $values: [ID!]) {
  options: users(filters: {search: $search, ids: $values}) {
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