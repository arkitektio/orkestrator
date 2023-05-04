import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Config: any;
  DateTime: any;
  Email: any;
  GenericScalar: any;
  Upload: any;
};

export type App = {
  __typename?: 'App';
  id: Scalars['ID'];
  identifier: Scalars['String'];
  logo?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  releases: Array<Release>;
};

export type Application = {
  __typename?: 'Application';
  algorithm?: Maybe<ApplicationAlgorithm>;
  authorizationGrantType: ApplicationAuthorizationGrantType;
  client?: Maybe<Client>;
  clientId: Scalars['String'];
  clientType: ApplicationClientType;
  created: Scalars['DateTime'];
  id: Scalars['ID'];
  /** The Url of the Image */
  image?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  /** The associated Redirect Uris */
  redirectUris?: Maybe<Array<Maybe<Scalars['String']>>>;
  skipAuthorization: Scalars['Boolean'];
  updated: Scalars['DateTime'];
  user?: Maybe<HerreUser>;
};

/** An enumeration. */
export enum ApplicationAlgorithm {
  /** No OIDC support */
  A = 'A_',
  /** HMAC with SHA-2 256 */
  Hs256 = 'HS256',
  /** RSA with SHA-2 256 */
  Rs256 = 'RS256'
}

/** An enumeration. */
export enum ApplicationAuthorizationGrantType {
  /** Authorization code */
  AuthorizationCode = 'AUTHORIZATION_CODE',
  /** Client credentials */
  ClientCredentials = 'CLIENT_CREDENTIALS',
  /** Implicit */
  Implicit = 'IMPLICIT',
  /** OpenID connect hybrid */
  OpenidHybrid = 'OPENID_HYBRID',
  /** Resource owner password-based */
  Password = 'PASSWORD'
}

/** An enumeration. */
export enum ApplicationClientType {
  /** Confidential */
  Confidential = 'CONFIDENTIAL',
  /** Public */
  Public = 'PUBLIC'
}

export type Channel = {
  __typename?: 'Channel';
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
  token?: Maybe<Scalars['String']>;
  user: HerreUser;
};

export type Client = {
  __typename?: 'Client';
  clientId: Scalars['String'];
  clientSecret: Scalars['String'];
  creator: HerreUser;
  id: Scalars['ID'];
  kind?: Maybe<ClientKind>;
  oauth2Client: Application;
  release?: Maybe<Release>;
  scopes: Array<Maybe<Scalars['String']>>;
  token: Scalars['String'];
  user?: Maybe<HerreUser>;
};

/** An enumeration. */
export enum ClientKind {
  /** Dekstop */
  Desktop = 'DESKTOP',
  /** User */
  User = 'USER',
  /** Website */
  Website = 'WEBSITE'
}

export type CreatedBackendApp = {
  __typename?: 'CreatedBackendApp';
  clientId?: Maybe<Scalars['String']>;
  clientSecret?: Maybe<Scalars['String']>;
};

export type DeleteApplicationResult = {
  __typename?: 'DeleteApplicationResult';
  clientId?: Maybe<Scalars['ID']>;
};

export type DeleteChannelResult = {
  __typename?: 'DeleteChannelResult';
  token?: Maybe<Scalars['String']>;
};

export type DeleteClientResult = {
  __typename?: 'DeleteClientResult';
  id?: Maybe<Scalars['ID']>;
};

export type DeviceCode = {
  __typename?: 'DeviceCode';
  code: Scalars['String'];
  createdAt: Scalars['DateTime'];
  graph?: Maybe<Graph>;
  id: Scalars['ID'];
  identifier?: Maybe<Scalars['String']>;
  logo?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  scopes?: Maybe<Scalars['GenericScalar']>;
  user?: Maybe<HerreUser>;
  version?: Maybe<Scalars['String']>;
};

export type Element = {
  __typename?: 'Element';
  graph: Graph;
  id: Scalars['ID'];
  name: Scalars['String'];
  values?: Maybe<Scalars['GenericScalar']>;
};

export enum GrantType {
  AuthorizationCode = 'AUTHORIZATION_CODE',
  ClientCredentials = 'CLIENT_CREDENTIALS',
  Implicit = 'IMPLICIT',
  Password = 'PASSWORD'
}

export type Graph = {
  __typename?: 'Graph';
  codes: Array<DeviceCode>;
  elements: Array<Element>;
  /** Is this appearing on a selection of hosts? */
  host: Scalars['String'];
  id: Scalars['ID'];
  name: Scalars['String'];
  version: Scalars['String'];
};

export type Group = {
  __typename?: 'Group';
  id: Scalars['ID'];
  name: Scalars['String'];
  profile?: Maybe<GroupProfile>;
  /** The groups this user belongs to. A user will get all permissions granted to each of their groups. */
  userSet: Array<HerreUser>;
};

export type GroupProfile = {
  __typename?: 'GroupProfile';
  avatar?: Maybe<Scalars['String']>;
  group: Group;
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
};

export type HerreUser = {
  __typename?: 'HerreUser';
  email: Scalars['String'];
  firstName: Scalars['String'];
  /** The groups this user belongs to. A user will get all permissions granted to each of their groups. */
  groups: Array<Group>;
  id: Scalars['ID'];
  /** Designates whether this user should be treated as active. Unselect this instead of deleting accounts. */
  isActive: Scalars['Boolean'];
  lastName: Scalars['String'];
  profile?: Maybe<Profile>;
  /** The associated rules of this  */
  roles?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: Scalars['String'];
};

export type Member = {
  __typename?: 'Member';
  id: Scalars['ID'];
  name: Scalars['String'];
};

/** The root Mutation */
export type Mutation = {
  __typename?: 'Mutation';
  changeMe?: Maybe<HerreUser>;
  createApplication?: Maybe<Application>;
  createChannel?: Maybe<Channel>;
  createElement?: Maybe<Element>;
  createGraph?: Maybe<Graph>;
  createPrivateClient?: Maybe<Client>;
  createPublicClient?: Maybe<Client>;
  createUserApp?: Maybe<CreatedBackendApp>;
  createUserLoginApp?: Maybe<Application>;
  deleteApplication?: Maybe<DeleteApplicationResult>;
  deleteChannel?: Maybe<DeleteChannelResult>;
  deleteClient?: Maybe<DeleteClientResult>;
  notifyUser?: Maybe<Array<Maybe<PublishResult>>>;
  publishToChannel?: Maybe<PublishResult>;
  updateApp?: Maybe<App>;
  updateGroup?: Maybe<Group>;
  updateUser?: Maybe<HerreUser>;
};


/** The root Mutation */
export type MutationChangeMeArgs = {
  email?: InputMaybe<Scalars['Email']>;
  firstName?: InputMaybe<Scalars['String']>;
  lastName?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationCreateApplicationArgs = {
  grantType: GrantType;
  name: Scalars['String'];
  redirectUris?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateChannelArgs = {
  name?: InputMaybe<Scalars['String']>;
  token: Scalars['String'];
};


/** The root Mutation */
export type MutationCreateElementArgs = {
  graph: Scalars['ID'];
  name: Scalars['String'];
  values: Scalars['Config'];
};


/** The root Mutation */
export type MutationCreateGraphArgs = {
  name: Scalars['String'];
};


/** The root Mutation */
export type MutationCreatePrivateClientArgs = {
  identifier: Scalars['String'];
  imitate?: InputMaybe<Scalars['ID']>;
  logoUrl?: InputMaybe<Scalars['String']>;
  scopes: Array<InputMaybe<Scalars['String']>>;
  version: Scalars['String'];
};


/** The root Mutation */
export type MutationCreatePublicClientArgs = {
  identifier: Scalars['String'];
  kind: PublicFaktType;
  logoUrl?: InputMaybe<Scalars['String']>;
  redirectUris: Array<InputMaybe<Scalars['String']>>;
  scopes: Array<InputMaybe<Scalars['String']>>;
  version: Scalars['String'];
};


/** The root Mutation */
export type MutationCreateUserAppArgs = {
  identifier: Scalars['String'];
  name: Scalars['String'];
  version: Scalars['String'];
};


/** The root Mutation */
export type MutationCreateUserLoginAppArgs = {
  name: Scalars['String'];
  redirectUris?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationDeleteApplicationArgs = {
  clientId: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteChannelArgs = {
  token: Scalars['String'];
};


/** The root Mutation */
export type MutationDeleteClientArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationNotifyUserArgs = {
  channels?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  message: Scalars['String'];
  title: Scalars['String'];
  user: Scalars['ID'];
};


/** The root Mutation */
export type MutationPublishToChannelArgs = {
  channel: Scalars['ID'];
  message: Scalars['String'];
  title: Scalars['String'];
};


/** The root Mutation */
export type MutationUpdateAppArgs = {
  id: Scalars['ID'];
  logo?: InputMaybe<Scalars['Upload']>;
};


/** The root Mutation */
export type MutationUpdateGroupArgs = {
  avatar?: InputMaybe<Scalars['Upload']>;
  id: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationUpdateUserArgs = {
  active?: InputMaybe<Scalars['Boolean']>;
  avatar?: InputMaybe<Scalars['Upload']>;
  email?: InputMaybe<Scalars['Email']>;
  firstName?: InputMaybe<Scalars['String']>;
  id: Scalars['ID'];
  lastName?: InputMaybe<Scalars['String']>;
};

export type Profile = {
  __typename?: 'Profile';
  avatar?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
  user: HerreUser;
};

export enum PublicFaktType {
  Dekstop = 'DEKSTOP',
  Website = 'WEBSITE'
}

export type PublishResult = {
  __typename?: 'PublishResult';
  channel?: Maybe<Channel>;
  status?: Maybe<Scalars['String']>;
};

/** The root Query */
export type Query = {
  __typename?: 'Query';
  app?: Maybe<App>;
  application?: Maybe<Application>;
  applications?: Maybe<Array<Maybe<Application>>>;
  apps?: Maybe<Array<Maybe<App>>>;
  /** Get a group */
  channel?: Maybe<Channel>;
  /** Get a list of users */
  channels?: Maybe<Array<Maybe<Channel>>>;
  client?: Maybe<Client>;
  clients?: Maybe<Array<Maybe<Client>>>;
  graphs?: Maybe<Array<Maybe<Graph>>>;
  /** Get a group */
  group?: Maybe<Group>;
  /** Get a list of users */
  groups?: Maybe<Array<Maybe<Group>>>;
  hello?: Maybe<Scalars['String']>;
  me?: Maybe<HerreUser>;
  /** Get information on your Docker Template */
  member?: Maybe<Member>;
  myPrivateClients?: Maybe<Array<Maybe<Client>>>;
  myPublicClients?: Maybe<Array<Maybe<Client>>>;
  myapplications?: Maybe<Array<Maybe<Application>>>;
  myclients?: Maybe<Array<Maybe<Application>>>;
  /** Get a list of users */
  mygroups?: Maybe<Array<Maybe<Group>>>;
  release?: Maybe<Release>;
  releases?: Maybe<Array<Maybe<Release>>>;
  scope?: Maybe<Scope>;
  scopes?: Maybe<Array<Maybe<Scope>>>;
  user?: Maybe<HerreUser>;
  userapp?: Maybe<Application>;
  users?: Maybe<Array<Maybe<HerreUser>>>;
  void?: Maybe<Scalars['String']>;
};


/** The root Query */
export type QueryAppArgs = {
  clientId?: InputMaybe<Scalars['ID']>;
  id?: InputMaybe<Scalars['ID']>;
  identifier?: InputMaybe<Scalars['String']>;
  version?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryApplicationArgs = {
  clientId: Scalars['ID'];
};


/** The root Query */
export type QueryAppsArgs = {
  search?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryChannelArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryChannelsArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  name?: InputMaybe<Scalars['String']>;
  search?: InputMaybe<Scalars['String']>;
  user?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryClientArgs = {
  clientId?: InputMaybe<Scalars['ID']>;
  id?: InputMaybe<Scalars['ID']>;
  token?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryGroupArgs = {
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryGroupsArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  name?: InputMaybe<Scalars['String']>;
  search?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryMemberArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryMygroupsArgs = {
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryReleaseArgs = {
  clientId?: InputMaybe<Scalars['ID']>;
  id?: InputMaybe<Scalars['ID']>;
  identifier?: InputMaybe<Scalars['String']>;
  version?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryReleasesArgs = {
  app?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryScopeArgs = {
  key: Scalars['String'];
};


/** The root Query */
export type QueryScopesArgs = {
  search?: InputMaybe<Scalars['String']>;
  values?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};


/** The root Query */
export type QueryUserArgs = {
  email?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryUserappArgs = {
  clientId?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryUsersArgs = {
  email?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  search?: InputMaybe<Scalars['String']>;
  username?: InputMaybe<Scalars['String']>;
};

export type Release = {
  __typename?: 'Release';
  app: App;
  clients: Array<Client>;
  id: Scalars['ID'];
  logo?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  version: Scalars['String'];
};

export type Scope = {
  __typename?: 'Scope';
  description?: Maybe<Scalars['String']>;
  label: Scalars['String'];
  value: Scalars['String'];
};

export type DetailAppFragment = { __typename?: 'App', id: string, identifier: string, logo?: string | null, releases: Array<{ __typename?: 'Release', id: string, version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } }> };

export type ListAppFragment = { __typename?: 'App', id: string, identifier: string, logo?: string | null };

export type DetailClientFragment = { __typename?: 'Client', id: string, token: string, user?: { __typename?: 'HerreUser', username: string } | null, release?: { __typename?: 'Release', version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null, oauth2Client: { __typename?: 'Application', authorizationGrantType: ApplicationAuthorizationGrantType, redirectUris?: Array<string | null> | null } };

export type ListClientFragment = { __typename?: 'Client', id: string, user?: { __typename?: 'HerreUser', username: string } | null, release?: { __typename?: 'Release', version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null };

export type DetailGroupFragment = { __typename?: 'Group', id: string, name: string, userSet: Array<{ __typename?: 'HerreUser', username: string, firstName: string, lastName: string, email: string, id: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null }>, profile?: { __typename?: 'GroupProfile', avatar?: string | null, name?: string | null } | null };

export type ListGroupFragment = { __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', avatar?: string | null, name?: string | null } | null };

export type DetailReleaseFragment = { __typename?: 'Release', id: string, version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null }, clients: Array<{ __typename?: 'Client', id: string, user?: { __typename?: 'HerreUser', username: string } | null, release?: { __typename?: 'Release', version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null }> };

export type ListReleaseFragment = { __typename?: 'Release', id: string, version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } };

export type ListUserFragment = { __typename?: 'HerreUser', username: string, firstName: string, lastName: string, email: string, id: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null };

export type DetailUserFragment = { __typename?: 'HerreUser', id: string, username: string, email: string, roles?: Array<string | null> | null, firstName: string, lastName: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null, groups: Array<{ __typename?: 'Group', id: string, name: string }> };

export type MeUserFragment = { __typename?: 'HerreUser', id: string, username: string, roles?: Array<string | null> | null, email: string, firstName: string, lastName: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null };

export type UpdateAppMutationVariables = Exact<{
  id: Scalars['ID'];
  logo?: InputMaybe<Scalars['Upload']>;
}>;


export type UpdateAppMutation = { __typename?: 'Mutation', updateApp?: { __typename?: 'App', id: string, identifier: string, logo?: string | null, releases: Array<{ __typename?: 'Release', id: string, version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } }> } | null };

export type CreatePrivateClientMutationVariables = Exact<{
  identifier: Scalars['String'];
  version: Scalars['String'];
  scopes: Array<Scalars['String']>;
  logoUrl?: InputMaybe<Scalars['String']>;
}>;


export type CreatePrivateClientMutation = { __typename?: 'Mutation', createPrivateClient?: { __typename?: 'Client', id: string, token: string, user?: { __typename?: 'HerreUser', username: string } | null, release?: { __typename?: 'Release', version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null, oauth2Client: { __typename?: 'Application', authorizationGrantType: ApplicationAuthorizationGrantType, redirectUris?: Array<string | null> | null } } | null };

export type CreatePublicClientMutationVariables = Exact<{
  identifier: Scalars['String'];
  version: Scalars['String'];
  redirectUris: Array<Scalars['String']>;
  scopes: Array<Scalars['String']>;
  kind: PublicFaktType;
  logoUrl?: InputMaybe<Scalars['String']>;
}>;


export type CreatePublicClientMutation = { __typename?: 'Mutation', createPublicClient?: { __typename?: 'Client', id: string, token: string, user?: { __typename?: 'HerreUser', username: string } | null, release?: { __typename?: 'Release', version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null, oauth2Client: { __typename?: 'Application', authorizationGrantType: ApplicationAuthorizationGrantType, redirectUris?: Array<string | null> | null } } | null };

export type DeleteClientMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteClientMutation = { __typename?: 'Mutation', deleteClient?: { __typename?: 'DeleteClientResult', id?: string | null } | null };

export type UpdateGroupMutationVariables = Exact<{
  id: Scalars['ID'];
  avatar?: InputMaybe<Scalars['Upload']>;
  name?: InputMaybe<Scalars['String']>;
}>;


export type UpdateGroupMutation = { __typename?: 'Mutation', updateGroup?: { __typename?: 'Group', id: string, name: string, userSet: Array<{ __typename?: 'HerreUser', username: string, firstName: string, lastName: string, email: string, id: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null }>, profile?: { __typename?: 'GroupProfile', avatar?: string | null, name?: string | null } | null } | null };

export type ChangeMeMutationVariables = Exact<{
  firstName?: InputMaybe<Scalars['String']>;
  lastName?: InputMaybe<Scalars['String']>;
  email?: InputMaybe<Scalars['Email']>;
}>;


export type ChangeMeMutation = { __typename?: 'Mutation', changeMe?: { __typename?: 'HerreUser', id: string, username: string, roles?: Array<string | null> | null, email: string, firstName: string, lastName: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null } | null };

export type UpdateUserMutationVariables = Exact<{
  id: Scalars['ID'];
  avatar?: InputMaybe<Scalars['Upload']>;
  firstName?: InputMaybe<Scalars['String']>;
  lastName?: InputMaybe<Scalars['String']>;
  email?: InputMaybe<Scalars['Email']>;
  active?: InputMaybe<Scalars['Boolean']>;
}>;


export type UpdateUserMutation = { __typename?: 'Mutation', updateUser?: { __typename?: 'HerreUser', id: string, username: string, email: string, roles?: Array<string | null> | null, firstName: string, lastName: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null, groups: Array<{ __typename?: 'Group', id: string, name: string }> } | null };

export type AppsQueryVariables = Exact<{ [key: string]: never; }>;


export type AppsQuery = { __typename?: 'Query', apps?: Array<{ __typename?: 'App', id: string, identifier: string, logo?: string | null } | null> | null };

export type AppQueryVariables = Exact<{
  identifier?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  clientId?: InputMaybe<Scalars['ID']>;
}>;


export type AppQuery = { __typename?: 'Query', app?: { __typename?: 'App', id: string, identifier: string, logo?: string | null, releases: Array<{ __typename?: 'Release', id: string, version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } }> } | null };

export type ClientsQueryVariables = Exact<{ [key: string]: never; }>;


export type ClientsQuery = { __typename?: 'Query', clients?: Array<{ __typename?: 'Client', id: string, user?: { __typename?: 'HerreUser', username: string } | null, release?: { __typename?: 'Release', version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null } | null> | null };

export type DetailClientQueryVariables = Exact<{
  clientId?: InputMaybe<Scalars['ID']>;
  id?: InputMaybe<Scalars['ID']>;
}>;


export type DetailClientQuery = { __typename?: 'Query', client?: { __typename?: 'Client', id: string, token: string, user?: { __typename?: 'HerreUser', username: string } | null, release?: { __typename?: 'Release', version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null, oauth2Client: { __typename?: 'Application', authorizationGrantType: ApplicationAuthorizationGrantType, redirectUris?: Array<string | null> | null } } | null };

export type MyPublicClientsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPublicClientsQuery = { __typename?: 'Query', myPublicClients?: Array<{ __typename?: 'Client', id: string, user?: { __typename?: 'HerreUser', username: string } | null, release?: { __typename?: 'Release', version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null } | null> | null };

export type MyPrivateClientsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPrivateClientsQuery = { __typename?: 'Query', myPrivateClients?: Array<{ __typename?: 'Client', id: string, user?: { __typename?: 'HerreUser', username: string } | null, release?: { __typename?: 'Release', version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null } | null> | null };

export type GroupOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type GroupOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Group', value: string, label: string } | null> | null };

export type MyGroupsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type MyGroupsQuery = { __typename?: 'Query', mygroups?: Array<{ __typename?: 'Group', id: string, name: string, userSet: Array<{ __typename?: 'HerreUser', id: string, username: string, email: string }> } | null> | null };

export type DetailGroupQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailGroupQuery = { __typename?: 'Query', group?: { __typename?: 'Group', id: string, name: string, userSet: Array<{ __typename?: 'HerreUser', username: string, firstName: string, lastName: string, email: string, id: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null }>, profile?: { __typename?: 'GroupProfile', avatar?: string | null, name?: string | null } | null } | null };

export type ReleasesQueryVariables = Exact<{ [key: string]: never; }>;


export type ReleasesQuery = { __typename?: 'Query', releases?: Array<{ __typename?: 'Release', id: string, version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null> | null };

export type ReleaseQueryVariables = Exact<{
  identifier?: InputMaybe<Scalars['String']>;
  version?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  clientId?: InputMaybe<Scalars['ID']>;
}>;


export type ReleaseQuery = { __typename?: 'Query', release?: { __typename?: 'Release', id: string, version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null }, clients: Array<{ __typename?: 'Client', id: string, user?: { __typename?: 'HerreUser', username: string } | null, release?: { __typename?: 'Release', version: string, logo?: string | null, app: { __typename?: 'App', id: string, identifier: string, logo?: string | null } } | null }> } | null };

export type ScopesQueryVariables = Exact<{ [key: string]: never; }>;


export type ScopesQuery = { __typename?: 'Query', scopes?: Array<{ __typename?: 'Scope', description?: string | null, value: string, label: string } | null> | null };

export type ScopesOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ScopesOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Scope', value: string, label: string } | null> | null };

export type LokGlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type LokGlobalSearchQuery = { __typename?: 'Query', apps?: Array<{ __typename?: 'App', id: string, identifier: string, logo?: string | null } | null> | null, users?: Array<{ __typename?: 'HerreUser', username: string, firstName: string, lastName: string, email: string, id: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null } | null> | null, groups?: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', avatar?: string | null, name?: string | null } | null } | null> | null };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'HerreUser', id: string, username: string, email: string, roles?: Array<string | null> | null, firstName: string, lastName: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null, groups: Array<{ __typename?: 'Group', id: string, name: string }> } | null };

export type UserQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type UserQuery = { __typename?: 'Query', user?: { __typename?: 'HerreUser', id: string, username: string, email: string, roles?: Array<string | null> | null, firstName: string, lastName: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null, groups: Array<{ __typename?: 'Group', id: string, name: string }> } | null };

export type DetailUserQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
}>;


export type DetailUserQuery = { __typename?: 'Query', user?: { __typename?: 'HerreUser', id: string, username: string, email: string, roles?: Array<string | null> | null, firstName: string, lastName: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null, groups: Array<{ __typename?: 'Group', id: string, name: string }> } | null };

export type UserOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type UserOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'HerreUser', value: string, label: string } | null> | null };

export type ProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfileQuery = { __typename?: 'Query', me?: { __typename?: 'HerreUser', id: string, username: string, roles?: Array<string | null> | null, email: string, firstName: string, lastName: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null } | null };

export const ListAppFragmentDoc = gql`
    fragment ListApp on App {
  id
  identifier
  logo
}
    `;
export const ListReleaseFragmentDoc = gql`
    fragment ListRelease on Release {
  id
  version
  logo
  app {
    ...ListApp
  }
}
    ${ListAppFragmentDoc}`;
export const DetailAppFragmentDoc = gql`
    fragment DetailApp on App {
  id
  identifier
  logo
  releases {
    ...ListRelease
  }
}
    ${ListReleaseFragmentDoc}`;
export const DetailClientFragmentDoc = gql`
    fragment DetailClient on Client {
  id
  token
  user {
    username
  }
  release {
    version
    logo
    app {
      id
      identifier
      logo
    }
  }
  oauth2Client {
    authorizationGrantType
    redirectUris
  }
}
    `;
export const ListUserFragmentDoc = gql`
    fragment ListUser on HerreUser {
  username
  firstName
  lastName
  email
  profile {
    avatar
  }
  id
}
    `;
export const DetailGroupFragmentDoc = gql`
    fragment DetailGroup on Group {
  id
  name
  userSet {
    ...ListUser
  }
  profile {
    avatar
    name
  }
}
    ${ListUserFragmentDoc}`;
export const ListGroupFragmentDoc = gql`
    fragment ListGroup on Group {
  id
  name
  profile {
    avatar
    name
  }
}
    `;
export const ListClientFragmentDoc = gql`
    fragment ListClient on Client {
  id
  user {
    username
  }
  release {
    version
    logo
    app {
      id
      identifier
      logo
    }
  }
}
    `;
export const DetailReleaseFragmentDoc = gql`
    fragment DetailRelease on Release {
  id
  version
  logo
  app {
    ...ListApp
  }
  clients {
    ...ListClient
  }
}
    ${ListAppFragmentDoc}
${ListClientFragmentDoc}`;
export const DetailUserFragmentDoc = gql`
    fragment DetailUser on HerreUser {
  id
  username
  email
  roles
  firstName
  lastName
  profile {
    avatar
  }
  groups {
    id
    name
  }
}
    `;
export const MeUserFragmentDoc = gql`
    fragment MeUser on HerreUser {
  id
  username
  roles
  email
  firstName
  lastName
  profile {
    avatar
  }
}
    `;
export const UpdateAppDocument = gql`
    mutation UpdateApp($id: ID!, $logo: Upload) {
  updateApp(id: $id, logo: $logo) {
    ...DetailApp
  }
}
    ${DetailAppFragmentDoc}`;
export type UpdateAppMutationFn = Apollo.MutationFunction<UpdateAppMutation, UpdateAppMutationVariables>;

/**
 * __useUpdateAppMutation__
 *
 * To run a mutation, you first call `useUpdateAppMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAppMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateAppMutation, { data, loading, error }] = useUpdateAppMutation({
 *   variables: {
 *      id: // value for 'id'
 *      logo: // value for 'logo'
 *   },
 * });
 */
export function useUpdateAppMutation(baseOptions?: Apollo.MutationHookOptions<UpdateAppMutation, UpdateAppMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateAppMutation, UpdateAppMutationVariables>(UpdateAppDocument, options);
      }
export type UpdateAppMutationHookResult = ReturnType<typeof useUpdateAppMutation>;
export type UpdateAppMutationResult = Apollo.MutationResult<UpdateAppMutation>;
export type UpdateAppMutationOptions = Apollo.BaseMutationOptions<UpdateAppMutation, UpdateAppMutationVariables>;
export const CreatePrivateClientDocument = gql`
    mutation CreatePrivateClient($identifier: String!, $version: String!, $scopes: [String!]!, $logoUrl: String) {
  createPrivateClient(
    identifier: $identifier
    version: $version
    scopes: $scopes
    logoUrl: $logoUrl
  ) {
    ...DetailClient
  }
}
    ${DetailClientFragmentDoc}`;
export type CreatePrivateClientMutationFn = Apollo.MutationFunction<CreatePrivateClientMutation, CreatePrivateClientMutationVariables>;

/**
 * __useCreatePrivateClientMutation__
 *
 * To run a mutation, you first call `useCreatePrivateClientMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePrivateClientMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPrivateClientMutation, { data, loading, error }] = useCreatePrivateClientMutation({
 *   variables: {
 *      identifier: // value for 'identifier'
 *      version: // value for 'version'
 *      scopes: // value for 'scopes'
 *      logoUrl: // value for 'logoUrl'
 *   },
 * });
 */
export function useCreatePrivateClientMutation(baseOptions?: Apollo.MutationHookOptions<CreatePrivateClientMutation, CreatePrivateClientMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePrivateClientMutation, CreatePrivateClientMutationVariables>(CreatePrivateClientDocument, options);
      }
export type CreatePrivateClientMutationHookResult = ReturnType<typeof useCreatePrivateClientMutation>;
export type CreatePrivateClientMutationResult = Apollo.MutationResult<CreatePrivateClientMutation>;
export type CreatePrivateClientMutationOptions = Apollo.BaseMutationOptions<CreatePrivateClientMutation, CreatePrivateClientMutationVariables>;
export const CreatePublicClientDocument = gql`
    mutation CreatePublicClient($identifier: String!, $version: String!, $redirectUris: [String!]!, $scopes: [String!]!, $kind: PublicFaktType!, $logoUrl: String) {
  createPublicClient(
    identifier: $identifier
    version: $version
    redirectUris: $redirectUris
    scopes: $scopes
    kind: $kind
    logoUrl: $logoUrl
  ) {
    ...DetailClient
  }
}
    ${DetailClientFragmentDoc}`;
export type CreatePublicClientMutationFn = Apollo.MutationFunction<CreatePublicClientMutation, CreatePublicClientMutationVariables>;

/**
 * __useCreatePublicClientMutation__
 *
 * To run a mutation, you first call `useCreatePublicClientMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePublicClientMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPublicClientMutation, { data, loading, error }] = useCreatePublicClientMutation({
 *   variables: {
 *      identifier: // value for 'identifier'
 *      version: // value for 'version'
 *      redirectUris: // value for 'redirectUris'
 *      scopes: // value for 'scopes'
 *      kind: // value for 'kind'
 *      logoUrl: // value for 'logoUrl'
 *   },
 * });
 */
export function useCreatePublicClientMutation(baseOptions?: Apollo.MutationHookOptions<CreatePublicClientMutation, CreatePublicClientMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePublicClientMutation, CreatePublicClientMutationVariables>(CreatePublicClientDocument, options);
      }
export type CreatePublicClientMutationHookResult = ReturnType<typeof useCreatePublicClientMutation>;
export type CreatePublicClientMutationResult = Apollo.MutationResult<CreatePublicClientMutation>;
export type CreatePublicClientMutationOptions = Apollo.BaseMutationOptions<CreatePublicClientMutation, CreatePublicClientMutationVariables>;
export const DeleteClientDocument = gql`
    mutation DeleteClient($id: ID!) {
  deleteClient(id: $id) {
    id
  }
}
    `;
export type DeleteClientMutationFn = Apollo.MutationFunction<DeleteClientMutation, DeleteClientMutationVariables>;

/**
 * __useDeleteClientMutation__
 *
 * To run a mutation, you first call `useDeleteClientMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteClientMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteClientMutation, { data, loading, error }] = useDeleteClientMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteClientMutation(baseOptions?: Apollo.MutationHookOptions<DeleteClientMutation, DeleteClientMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteClientMutation, DeleteClientMutationVariables>(DeleteClientDocument, options);
      }
export type DeleteClientMutationHookResult = ReturnType<typeof useDeleteClientMutation>;
export type DeleteClientMutationResult = Apollo.MutationResult<DeleteClientMutation>;
export type DeleteClientMutationOptions = Apollo.BaseMutationOptions<DeleteClientMutation, DeleteClientMutationVariables>;
export const UpdateGroupDocument = gql`
    mutation UpdateGroup($id: ID!, $avatar: Upload, $name: String) {
  updateGroup(id: $id, avatar: $avatar, name: $name) {
    ...DetailGroup
  }
}
    ${DetailGroupFragmentDoc}`;
export type UpdateGroupMutationFn = Apollo.MutationFunction<UpdateGroupMutation, UpdateGroupMutationVariables>;

/**
 * __useUpdateGroupMutation__
 *
 * To run a mutation, you first call `useUpdateGroupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGroupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGroupMutation, { data, loading, error }] = useUpdateGroupMutation({
 *   variables: {
 *      id: // value for 'id'
 *      avatar: // value for 'avatar'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useUpdateGroupMutation(baseOptions?: Apollo.MutationHookOptions<UpdateGroupMutation, UpdateGroupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateGroupMutation, UpdateGroupMutationVariables>(UpdateGroupDocument, options);
      }
export type UpdateGroupMutationHookResult = ReturnType<typeof useUpdateGroupMutation>;
export type UpdateGroupMutationResult = Apollo.MutationResult<UpdateGroupMutation>;
export type UpdateGroupMutationOptions = Apollo.BaseMutationOptions<UpdateGroupMutation, UpdateGroupMutationVariables>;
export const ChangeMeDocument = gql`
    mutation ChangeMe($firstName: String, $lastName: String, $email: Email) {
  changeMe(firstName: $firstName, lastName: $lastName, email: $email) {
    ...MeUser
  }
}
    ${MeUserFragmentDoc}`;
export type ChangeMeMutationFn = Apollo.MutationFunction<ChangeMeMutation, ChangeMeMutationVariables>;

/**
 * __useChangeMeMutation__
 *
 * To run a mutation, you first call `useChangeMeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChangeMeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [changeMeMutation, { data, loading, error }] = useChangeMeMutation({
 *   variables: {
 *      firstName: // value for 'firstName'
 *      lastName: // value for 'lastName'
 *      email: // value for 'email'
 *   },
 * });
 */
export function useChangeMeMutation(baseOptions?: Apollo.MutationHookOptions<ChangeMeMutation, ChangeMeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ChangeMeMutation, ChangeMeMutationVariables>(ChangeMeDocument, options);
      }
export type ChangeMeMutationHookResult = ReturnType<typeof useChangeMeMutation>;
export type ChangeMeMutationResult = Apollo.MutationResult<ChangeMeMutation>;
export type ChangeMeMutationOptions = Apollo.BaseMutationOptions<ChangeMeMutation, ChangeMeMutationVariables>;
export const UpdateUserDocument = gql`
    mutation UpdateUser($id: ID!, $avatar: Upload, $firstName: String, $lastName: String, $email: Email, $active: Boolean) {
  updateUser(
    id: $id
    avatar: $avatar
    firstName: $firstName
    lastName: $lastName
    email: $email
    active: $active
  ) {
    ...DetailUser
  }
}
    ${DetailUserFragmentDoc}`;
export type UpdateUserMutationFn = Apollo.MutationFunction<UpdateUserMutation, UpdateUserMutationVariables>;

/**
 * __useUpdateUserMutation__
 *
 * To run a mutation, you first call `useUpdateUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserMutation, { data, loading, error }] = useUpdateUserMutation({
 *   variables: {
 *      id: // value for 'id'
 *      avatar: // value for 'avatar'
 *      firstName: // value for 'firstName'
 *      lastName: // value for 'lastName'
 *      email: // value for 'email'
 *      active: // value for 'active'
 *   },
 * });
 */
export function useUpdateUserMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUserMutation, UpdateUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateUserMutation, UpdateUserMutationVariables>(UpdateUserDocument, options);
      }
export type UpdateUserMutationHookResult = ReturnType<typeof useUpdateUserMutation>;
export type UpdateUserMutationResult = Apollo.MutationResult<UpdateUserMutation>;
export type UpdateUserMutationOptions = Apollo.BaseMutationOptions<UpdateUserMutation, UpdateUserMutationVariables>;
export const AppsDocument = gql`
    query Apps {
  apps {
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
 *   },
 * });
 */
export function useAppsQuery(baseOptions?: Apollo.QueryHookOptions<AppsQuery, AppsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AppsQuery, AppsQueryVariables>(AppsDocument, options);
      }
export function useAppsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AppsQuery, AppsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AppsQuery, AppsQueryVariables>(AppsDocument, options);
        }
export type AppsQueryHookResult = ReturnType<typeof useAppsQuery>;
export type AppsLazyQueryHookResult = ReturnType<typeof useAppsLazyQuery>;
export type AppsQueryResult = Apollo.QueryResult<AppsQuery, AppsQueryVariables>;
export const AppDocument = gql`
    query App($identifier: String, $id: ID, $clientId: ID) {
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
export function useAppQuery(baseOptions?: Apollo.QueryHookOptions<AppQuery, AppQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AppQuery, AppQueryVariables>(AppDocument, options);
      }
export function useAppLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AppQuery, AppQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AppQuery, AppQueryVariables>(AppDocument, options);
        }
export type AppQueryHookResult = ReturnType<typeof useAppQuery>;
export type AppLazyQueryHookResult = ReturnType<typeof useAppLazyQuery>;
export type AppQueryResult = Apollo.QueryResult<AppQuery, AppQueryVariables>;
export const ClientsDocument = gql`
    query Clients {
  clients {
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
 *   },
 * });
 */
export function useClientsQuery(baseOptions?: Apollo.QueryHookOptions<ClientsQuery, ClientsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClientsQuery, ClientsQueryVariables>(ClientsDocument, options);
      }
export function useClientsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClientsQuery, ClientsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClientsQuery, ClientsQueryVariables>(ClientsDocument, options);
        }
export type ClientsQueryHookResult = ReturnType<typeof useClientsQuery>;
export type ClientsLazyQueryHookResult = ReturnType<typeof useClientsLazyQuery>;
export type ClientsQueryResult = Apollo.QueryResult<ClientsQuery, ClientsQueryVariables>;
export const DetailClientDocument = gql`
    query DetailClient($clientId: ID, $id: ID) {
  client(clientId: $clientId, id: $id) {
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
 *      clientId: // value for 'clientId'
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailClientQuery(baseOptions?: Apollo.QueryHookOptions<DetailClientQuery, DetailClientQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailClientQuery, DetailClientQueryVariables>(DetailClientDocument, options);
      }
export function useDetailClientLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailClientQuery, DetailClientQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailClientQuery, DetailClientQueryVariables>(DetailClientDocument, options);
        }
export type DetailClientQueryHookResult = ReturnType<typeof useDetailClientQuery>;
export type DetailClientLazyQueryHookResult = ReturnType<typeof useDetailClientLazyQuery>;
export type DetailClientQueryResult = Apollo.QueryResult<DetailClientQuery, DetailClientQueryVariables>;
export const MyPublicClientsDocument = gql`
    query MyPublicClients {
  myPublicClients {
    ...ListClient
  }
}
    ${ListClientFragmentDoc}`;

/**
 * __useMyPublicClientsQuery__
 *
 * To run a query within a React component, call `useMyPublicClientsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyPublicClientsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyPublicClientsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyPublicClientsQuery(baseOptions?: Apollo.QueryHookOptions<MyPublicClientsQuery, MyPublicClientsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyPublicClientsQuery, MyPublicClientsQueryVariables>(MyPublicClientsDocument, options);
      }
export function useMyPublicClientsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyPublicClientsQuery, MyPublicClientsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyPublicClientsQuery, MyPublicClientsQueryVariables>(MyPublicClientsDocument, options);
        }
export type MyPublicClientsQueryHookResult = ReturnType<typeof useMyPublicClientsQuery>;
export type MyPublicClientsLazyQueryHookResult = ReturnType<typeof useMyPublicClientsLazyQuery>;
export type MyPublicClientsQueryResult = Apollo.QueryResult<MyPublicClientsQuery, MyPublicClientsQueryVariables>;
export const MyPrivateClientsDocument = gql`
    query MyPrivateClients {
  myPrivateClients {
    ...ListClient
  }
}
    ${ListClientFragmentDoc}`;

/**
 * __useMyPrivateClientsQuery__
 *
 * To run a query within a React component, call `useMyPrivateClientsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyPrivateClientsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyPrivateClientsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyPrivateClientsQuery(baseOptions?: Apollo.QueryHookOptions<MyPrivateClientsQuery, MyPrivateClientsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyPrivateClientsQuery, MyPrivateClientsQueryVariables>(MyPrivateClientsDocument, options);
      }
export function useMyPrivateClientsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyPrivateClientsQuery, MyPrivateClientsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyPrivateClientsQuery, MyPrivateClientsQueryVariables>(MyPrivateClientsDocument, options);
        }
export type MyPrivateClientsQueryHookResult = ReturnType<typeof useMyPrivateClientsQuery>;
export type MyPrivateClientsLazyQueryHookResult = ReturnType<typeof useMyPrivateClientsLazyQuery>;
export type MyPrivateClientsQueryResult = Apollo.QueryResult<MyPrivateClientsQuery, MyPrivateClientsQueryVariables>;
export const GroupOptionsDocument = gql`
    query GroupOptions($search: String) {
  options: groups(name: $search) {
    value: name
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
 *   },
 * });
 */
export function useGroupOptionsQuery(baseOptions?: Apollo.QueryHookOptions<GroupOptionsQuery, GroupOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GroupOptionsQuery, GroupOptionsQueryVariables>(GroupOptionsDocument, options);
      }
export function useGroupOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GroupOptionsQuery, GroupOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GroupOptionsQuery, GroupOptionsQueryVariables>(GroupOptionsDocument, options);
        }
export type GroupOptionsQueryHookResult = ReturnType<typeof useGroupOptionsQuery>;
export type GroupOptionsLazyQueryHookResult = ReturnType<typeof useGroupOptionsLazyQuery>;
export type GroupOptionsQueryResult = Apollo.QueryResult<GroupOptionsQuery, GroupOptionsQueryVariables>;
export const MyGroupsDocument = gql`
    query MyGroups($search: String) {
  mygroups(name: $search) {
    id
    name
    userSet {
      id
      username
      email
    }
  }
}
    `;

/**
 * __useMyGroupsQuery__
 *
 * To run a query within a React component, call `useMyGroupsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyGroupsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyGroupsQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useMyGroupsQuery(baseOptions?: Apollo.QueryHookOptions<MyGroupsQuery, MyGroupsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyGroupsQuery, MyGroupsQueryVariables>(MyGroupsDocument, options);
      }
export function useMyGroupsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyGroupsQuery, MyGroupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyGroupsQuery, MyGroupsQueryVariables>(MyGroupsDocument, options);
        }
export type MyGroupsQueryHookResult = ReturnType<typeof useMyGroupsQuery>;
export type MyGroupsLazyQueryHookResult = ReturnType<typeof useMyGroupsLazyQuery>;
export type MyGroupsQueryResult = Apollo.QueryResult<MyGroupsQuery, MyGroupsQueryVariables>;
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
export function useDetailGroupQuery(baseOptions: Apollo.QueryHookOptions<DetailGroupQuery, DetailGroupQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailGroupQuery, DetailGroupQueryVariables>(DetailGroupDocument, options);
      }
export function useDetailGroupLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailGroupQuery, DetailGroupQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailGroupQuery, DetailGroupQueryVariables>(DetailGroupDocument, options);
        }
export type DetailGroupQueryHookResult = ReturnType<typeof useDetailGroupQuery>;
export type DetailGroupLazyQueryHookResult = ReturnType<typeof useDetailGroupLazyQuery>;
export type DetailGroupQueryResult = Apollo.QueryResult<DetailGroupQuery, DetailGroupQueryVariables>;
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
export function useReleasesQuery(baseOptions?: Apollo.QueryHookOptions<ReleasesQuery, ReleasesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReleasesQuery, ReleasesQueryVariables>(ReleasesDocument, options);
      }
export function useReleasesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReleasesQuery, ReleasesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReleasesQuery, ReleasesQueryVariables>(ReleasesDocument, options);
        }
export type ReleasesQueryHookResult = ReturnType<typeof useReleasesQuery>;
export type ReleasesLazyQueryHookResult = ReturnType<typeof useReleasesLazyQuery>;
export type ReleasesQueryResult = Apollo.QueryResult<ReleasesQuery, ReleasesQueryVariables>;
export const ReleaseDocument = gql`
    query Release($identifier: String, $version: String, $id: ID, $clientId: ID) {
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
export function useReleaseQuery(baseOptions?: Apollo.QueryHookOptions<ReleaseQuery, ReleaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReleaseQuery, ReleaseQueryVariables>(ReleaseDocument, options);
      }
export function useReleaseLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReleaseQuery, ReleaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReleaseQuery, ReleaseQueryVariables>(ReleaseDocument, options);
        }
export type ReleaseQueryHookResult = ReturnType<typeof useReleaseQuery>;
export type ReleaseLazyQueryHookResult = ReturnType<typeof useReleaseLazyQuery>;
export type ReleaseQueryResult = Apollo.QueryResult<ReleaseQuery, ReleaseQueryVariables>;
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
export function useScopesQuery(baseOptions?: Apollo.QueryHookOptions<ScopesQuery, ScopesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ScopesQuery, ScopesQueryVariables>(ScopesDocument, options);
      }
export function useScopesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ScopesQuery, ScopesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ScopesQuery, ScopesQueryVariables>(ScopesDocument, options);
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
export function useScopesOptionsQuery(baseOptions?: Apollo.QueryHookOptions<ScopesOptionsQuery, ScopesOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ScopesOptionsQuery, ScopesOptionsQueryVariables>(ScopesOptionsDocument, options);
      }
export function useScopesOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ScopesOptionsQuery, ScopesOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ScopesOptionsQuery, ScopesOptionsQueryVariables>(ScopesOptionsDocument, options);
        }
export type ScopesOptionsQueryHookResult = ReturnType<typeof useScopesOptionsQuery>;
export type ScopesOptionsLazyQueryHookResult = ReturnType<typeof useScopesOptionsLazyQuery>;
export type ScopesOptionsQueryResult = Apollo.QueryResult<ScopesOptionsQuery, ScopesOptionsQueryVariables>;
export const LokGlobalSearchDocument = gql`
    query LokGlobalSearch($search: String) {
  apps(search: $search) {
    ...ListApp
  }
  users(search: $search) {
    ...ListUser
  }
  groups(search: $search) {
    ...ListGroup
  }
}
    ${ListAppFragmentDoc}
${ListUserFragmentDoc}
${ListGroupFragmentDoc}`;

/**
 * __useLokGlobalSearchQuery__
 *
 * To run a query within a React component, call `useLokGlobalSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useLokGlobalSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLokGlobalSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useLokGlobalSearchQuery(baseOptions?: Apollo.QueryHookOptions<LokGlobalSearchQuery, LokGlobalSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LokGlobalSearchQuery, LokGlobalSearchQueryVariables>(LokGlobalSearchDocument, options);
      }
export function useLokGlobalSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LokGlobalSearchQuery, LokGlobalSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LokGlobalSearchQuery, LokGlobalSearchQueryVariables>(LokGlobalSearchDocument, options);
        }
export type LokGlobalSearchQueryHookResult = ReturnType<typeof useLokGlobalSearchQuery>;
export type LokGlobalSearchLazyQueryHookResult = ReturnType<typeof useLokGlobalSearchLazyQuery>;
export type LokGlobalSearchQueryResult = Apollo.QueryResult<LokGlobalSearchQuery, LokGlobalSearchQueryVariables>;
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
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
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
export function useUserQuery(baseOptions: Apollo.QueryHookOptions<UserQuery, UserQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UserQuery, UserQueryVariables>(UserDocument, options);
      }
export function useUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UserQuery, UserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UserQuery, UserQueryVariables>(UserDocument, options);
        }
export type UserQueryHookResult = ReturnType<typeof useUserQuery>;
export type UserLazyQueryHookResult = ReturnType<typeof useUserLazyQuery>;
export type UserQueryResult = Apollo.QueryResult<UserQuery, UserQueryVariables>;
export const DetailUserDocument = gql`
    query DetailUser($id: ID) {
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
export function useDetailUserQuery(baseOptions?: Apollo.QueryHookOptions<DetailUserQuery, DetailUserQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailUserQuery, DetailUserQueryVariables>(DetailUserDocument, options);
      }
export function useDetailUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailUserQuery, DetailUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailUserQuery, DetailUserQueryVariables>(DetailUserDocument, options);
        }
export type DetailUserQueryHookResult = ReturnType<typeof useDetailUserQuery>;
export type DetailUserLazyQueryHookResult = ReturnType<typeof useDetailUserLazyQuery>;
export type DetailUserQueryResult = Apollo.QueryResult<DetailUserQuery, DetailUserQueryVariables>;
export const UserOptionsDocument = gql`
    query UserOptions($search: String) {
  options: users(search: $search) {
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
 *   },
 * });
 */
export function useUserOptionsQuery(baseOptions?: Apollo.QueryHookOptions<UserOptionsQuery, UserOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UserOptionsQuery, UserOptionsQueryVariables>(UserOptionsDocument, options);
      }
export function useUserOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UserOptionsQuery, UserOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UserOptionsQuery, UserOptionsQueryVariables>(UserOptionsDocument, options);
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
export function useProfileQuery(baseOptions?: Apollo.QueryHookOptions<ProfileQuery, ProfileQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
      }
export function useProfileLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProfileQuery, ProfileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
        }
export type ProfileQueryHookResult = ReturnType<typeof useProfileQuery>;
export type ProfileLazyQueryHookResult = ReturnType<typeof useProfileLazyQuery>;
export type ProfileQueryResult = Apollo.QueryResult<ProfileQuery, ProfileQueryVariables>;