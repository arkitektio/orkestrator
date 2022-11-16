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
  version: Scalars['String'];
};

export type Application = {
  __typename?: 'Application';
  algorithm?: Maybe<ApplicationAlgorithm>;
  authorizationGrantType: ApplicationAuthorizationGrantType;
  clientId: Scalars['String'];
  clientType: ApplicationClientType;
  created: Scalars['DateTime'];
  faktapplication?: Maybe<FaktApplication>;
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

export type CreatedBackendApp = {
  __typename?: 'CreatedBackendApp';
  clientId?: Maybe<Scalars['String']>;
  clientSecret?: Maybe<Scalars['String']>;
};

export type DeleteApplicationResult = {
  __typename?: 'DeleteApplicationResult';
  clientId?: Maybe<Scalars['ID']>;
};

export type DeletePrivateFaktResult = {
  __typename?: 'DeletePrivateFaktResult';
  id?: Maybe<Scalars['ID']>;
};

export type DeletePublicFaktResult = {
  __typename?: 'DeletePublicFaktResult';
  id?: Maybe<Scalars['ID']>;
};

export type DeviceCode = {
  __typename?: 'DeviceCode';
  code: Scalars['String'];
  createdAt: Scalars['DateTime'];
  graph?: Maybe<Graph>;
  id: Scalars['ID'];
  identifier?: Maybe<Scalars['String']>;
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

export type FaktApplication = {
  __typename?: 'FaktApplication';
  application: Application;
  clientId: Scalars['String'];
  clientSecret: Scalars['String'];
  creator: HerreUser;
  id: Scalars['ID'];
  logo?: Maybe<Scalars['String']>;
  privatefaktapplication?: Maybe<PrivateFaktApplication>;
  publicfaktapplication?: Maybe<PublicFaktApplication>;
  scopes: Array<Maybe<Scalars['String']>>;
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
  privateApplications: Array<PrivateFaktApplication>;
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
  createElement?: Maybe<Element>;
  createGraph?: Maybe<Graph>;
  createPrivateFakt?: Maybe<PrivateFaktApplication>;
  createPublicFakt?: Maybe<PublicFaktApplication>;
  createUserApp?: Maybe<CreatedBackendApp>;
  createUserLoginApp?: Maybe<Application>;
  deleteApplication?: Maybe<DeleteApplicationResult>;
  deletePrivateFakt?: Maybe<DeletePrivateFaktResult>;
  deletePublicFakt?: Maybe<DeletePublicFaktResult>;
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
export type MutationCreatePrivateFaktArgs = {
  identifier: Scalars['String'];
  imitate?: InputMaybe<Scalars['ID']>;
  scopes: Array<InputMaybe<Scalars['String']>>;
  version: Scalars['String'];
};


/** The root Mutation */
export type MutationCreatePublicFaktArgs = {
  identifier: Scalars['String'];
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
export type MutationDeletePrivateFaktArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeletePublicFaktArgs = {
  id: Scalars['ID'];
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

export type PrivateFaktApplication = {
  __typename?: 'PrivateFaktApplication';
  application: Application;
  clientId: Scalars['String'];
  clientSecret: Scalars['String'];
  creator: HerreUser;
  faktapplicationPtr: FaktApplication;
  id: Scalars['ID'];
  identifier: Scalars['String'];
  logo?: Maybe<Scalars['String']>;
  scopes?: Maybe<Scalars['GenericScalar']>;
  user: HerreUser;
  version: Scalars['String'];
};

export type Profile = {
  __typename?: 'Profile';
  avatar?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
  user: HerreUser;
};

export type PublicFaktApplication = {
  __typename?: 'PublicFaktApplication';
  application: Application;
  clientId: Scalars['String'];
  clientSecret: Scalars['String'];
  confidential: Scalars['Boolean'];
  creator: HerreUser;
  faktapplicationPtr: FaktApplication;
  id: Scalars['ID'];
  identifier: Scalars['String'];
  logo?: Maybe<Scalars['String']>;
  redirectUri: Scalars['String'];
  scopes: Array<Maybe<Scalars['String']>>;
  version: Scalars['String'];
};

/** The root Query */
export type Query = {
  __typename?: 'Query';
  app?: Maybe<App>;
  application?: Maybe<Application>;
  applications?: Maybe<Array<Maybe<Application>>>;
  apps?: Maybe<Array<Maybe<App>>>;
  graphs?: Maybe<Array<Maybe<Graph>>>;
  /** Get a group */
  group?: Maybe<Group>;
  /** Get a list of users */
  groups?: Maybe<Array<Maybe<Group>>>;
  hello?: Maybe<Scalars['String']>;
  me?: Maybe<HerreUser>;
  /** Get information on your Docker Template */
  member?: Maybe<Member>;
  myapplications?: Maybe<Array<Maybe<Application>>>;
  /** Get a list of users */
  mygroups?: Maybe<Array<Maybe<Group>>>;
  privatefaktapp?: Maybe<PrivateFaktApplication>;
  privatefaktapps?: Maybe<Array<Maybe<PrivateFaktApplication>>>;
  publicfaktapp?: Maybe<PublicFaktApplication>;
  publicfaktapps?: Maybe<Array<Maybe<PublicFaktApplication>>>;
  scope?: Maybe<Scope>;
  scopes?: Maybe<Array<Maybe<Scope>>>;
  user?: Maybe<HerreUser>;
  userapp?: Maybe<Application>;
  users?: Maybe<Array<Maybe<HerreUser>>>;
  void?: Maybe<Scalars['String']>;
};


/** The root Query */
export type QueryAppArgs = {
  clientId?: InputMaybe<Scalars['String']>;
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
export type QueryGroupArgs = {
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryGroupsArgs = {
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
export type QueryPrivatefaktappArgs = {
  id?: InputMaybe<Scalars['ID']>;
  identifier?: InputMaybe<Scalars['String']>;
  version?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryPublicfaktappArgs = {
  id?: InputMaybe<Scalars['ID']>;
  identifier?: InputMaybe<Scalars['String']>;
  version?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryScopeArgs = {
  key: Scalars['String'];
};


/** The root Query */
export type QueryScopesArgs = {
  search?: InputMaybe<Scalars['String']>;
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
  search?: InputMaybe<Scalars['String']>;
  username?: InputMaybe<Scalars['String']>;
};

export type Scope = {
  __typename?: 'Scope';
  description?: Maybe<Scalars['String']>;
  label: Scalars['String'];
  value: Scalars['String'];
};

export type DetailAppFragment = { __typename?: 'App', id: string, identifier: string, version: string, logo?: string | null };

export type ListAppFragment = { __typename?: 'App', id: string, identifier: string, version: string, logo?: string | null };

export type DetailApplicationFragment = { __typename?: 'Application', id: string, clientId: string, authorizationGrantType: ApplicationAuthorizationGrantType, name: string, image?: string | null, created: any, redirectUris?: Array<string | null> | null, user?: { __typename?: 'HerreUser', username: string } | null };

export type ListApplicationFragment = { __typename?: 'Application', id: string, clientId: string, name: string, created: any, redirectUris?: Array<string | null> | null, user?: { __typename?: 'HerreUser', username: string } | null };

export type PrivateFaktFragment = { __typename?: 'PrivateFaktApplication', id: string, clientId: string, clientSecret: string, scopes?: any | null, version: string, identifier: string };

export type PublicFaktFragment = { __typename?: 'PublicFaktApplication', id: string, clientId: string, clientSecret: string, scopes: Array<string | null>, version: string, identifier: string };

export type DetailGroupFragment = { __typename?: 'Group', id: string, name: string, userSet: Array<{ __typename?: 'HerreUser', username: string, firstName: string, lastName: string, email: string, id: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null }>, profile?: { __typename?: 'GroupProfile', avatar?: string | null, name?: string | null } | null };

export type ListGroupFragment = { __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', avatar?: string | null, name?: string | null } | null };

export type ListUserFragment = { __typename?: 'HerreUser', username: string, firstName: string, lastName: string, email: string, id: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null };

export type DetailUserFragment = { __typename?: 'HerreUser', id: string, username: string, email: string, roles?: Array<string | null> | null, firstName: string, lastName: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null, groups: Array<{ __typename?: 'Group', id: string, name: string }> };

export type MeUserFragment = { __typename?: 'HerreUser', id: string, username: string, roles?: Array<string | null> | null, email: string, firstName: string, lastName: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null };

export type UpdateAppMutationVariables = Exact<{
  id: Scalars['ID'];
  logo?: InputMaybe<Scalars['Upload']>;
}>;


export type UpdateAppMutation = { __typename?: 'Mutation', updateApp?: { __typename?: 'App', id: string, identifier: string, version: string, logo?: string | null } | null };

export type CreateApplicationMutationVariables = Exact<{
  grantType: GrantType;
  name: Scalars['String'];
  redirectUris?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
}>;


export type CreateApplicationMutation = { __typename?: 'Mutation', createApplication?: { __typename?: 'Application', id: string, clientId: string, authorizationGrantType: ApplicationAuthorizationGrantType, name: string, image?: string | null, created: any, redirectUris?: Array<string | null> | null, user?: { __typename?: 'HerreUser', username: string } | null } | null };

export type CreateUserLoginAppMutationVariables = Exact<{
  name: Scalars['String'];
  redirectUris?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
}>;


export type CreateUserLoginAppMutation = { __typename?: 'Mutation', createUserLoginApp?: { __typename?: 'Application', id: string, clientId: string, authorizationGrantType: ApplicationAuthorizationGrantType, name: string, image?: string | null, created: any, redirectUris?: Array<string | null> | null, user?: { __typename?: 'HerreUser', username: string } | null } | null };

export type CreateUserAppMutationVariables = Exact<{
  name: Scalars['String'];
  identifier: Scalars['String'];
  version: Scalars['String'];
}>;


export type CreateUserAppMutation = { __typename?: 'Mutation', createUserApp?: { __typename?: 'CreatedBackendApp', clientSecret?: string | null, clientId?: string | null } | null };

export type DeleteApplicationMutationVariables = Exact<{
  clientId: Scalars['ID'];
}>;


export type DeleteApplicationMutation = { __typename?: 'Mutation', deleteApplication?: { __typename?: 'DeleteApplicationResult', clientId?: string | null } | null };

export type CreatePrivateFaktMutationVariables = Exact<{
  identifier: Scalars['String'];
  version: Scalars['String'];
  scopes: Array<Scalars['String']>;
}>;


export type CreatePrivateFaktMutation = { __typename?: 'Mutation', createPrivateFakt?: { __typename?: 'PrivateFaktApplication', id: string, clientId: string, clientSecret: string, scopes?: any | null, version: string, identifier: string } | null };

export type CreatePublicFaktMutationVariables = Exact<{
  identifier: Scalars['String'];
  version: Scalars['String'];
  redirectUris: Array<Scalars['String']>;
  scopes: Array<Scalars['String']>;
}>;


export type CreatePublicFaktMutation = { __typename?: 'Mutation', createPublicFakt?: { __typename?: 'PublicFaktApplication', id: string, clientId: string, clientSecret: string } | null };

export type DeletePublicFaktMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeletePublicFaktMutation = { __typename?: 'Mutation', deletePublicFakt?: { __typename?: 'DeletePublicFaktResult', id?: string | null } | null };

export type DeletePrivateFaktMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeletePrivateFaktMutation = { __typename?: 'Mutation', deletePrivateFakt?: { __typename?: 'DeletePrivateFaktResult', id?: string | null } | null };

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


export type AppsQuery = { __typename?: 'Query', apps?: Array<{ __typename?: 'App', id: string, identifier: string, version: string, logo?: string | null } | null> | null };

export type AppQueryVariables = Exact<{
  identifier?: InputMaybe<Scalars['String']>;
  version?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  clientId?: InputMaybe<Scalars['String']>;
}>;


export type AppQuery = { __typename?: 'Query', app?: { __typename?: 'App', id: string, identifier: string, version: string, logo?: string | null } | null };

export type ApplicationsQueryVariables = Exact<{ [key: string]: never; }>;


export type ApplicationsQuery = { __typename?: 'Query', applications?: Array<{ __typename?: 'Application', id: string, clientId: string, authorizationGrantType: ApplicationAuthorizationGrantType, name: string, image?: string | null, created: any, redirectUris?: Array<string | null> | null, user?: { __typename?: 'HerreUser', username: string } | null } | null> | null };

export type DetailApplicationQueryVariables = Exact<{
  clientId: Scalars['ID'];
}>;


export type DetailApplicationQuery = { __typename?: 'Query', application?: { __typename?: 'Application', id: string, clientId: string, authorizationGrantType: ApplicationAuthorizationGrantType, name: string, image?: string | null, created: any, redirectUris?: Array<string | null> | null, user?: { __typename?: 'HerreUser', username: string } | null } | null };

export type DetailUserApplicationQueryVariables = Exact<{
  clientId?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
}>;


export type DetailUserApplicationQuery = { __typename?: 'Query', userapp?: { __typename?: 'Application', id: string, clientId: string, authorizationGrantType: ApplicationAuthorizationGrantType, name: string, image?: string | null, created: any, redirectUris?: Array<string | null> | null, user?: { __typename?: 'HerreUser', username: string } | null } | null };

export type PublicFaktsQueryVariables = Exact<{ [key: string]: never; }>;


export type PublicFaktsQuery = { __typename?: 'Query', publicfaktapps?: Array<{ __typename?: 'PublicFaktApplication', id: string, clientId: string, clientSecret: string, scopes: Array<string | null>, version: string, identifier: string } | null> | null };

export type PublicFaktQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type PublicFaktQuery = { __typename?: 'Query', publicfaktapp?: { __typename?: 'PublicFaktApplication', id: string, clientId: string, clientSecret: string, scopes: Array<string | null>, version: string, identifier: string } | null };

export type PrivateFaktsQueryVariables = Exact<{ [key: string]: never; }>;


export type PrivateFaktsQuery = { __typename?: 'Query', privatefaktapps?: Array<{ __typename?: 'PrivateFaktApplication', id: string, clientId: string, clientSecret: string, scopes?: any | null, version: string, identifier: string } | null> | null };

export type PrivateFaktQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type PrivateFaktQuery = { __typename?: 'Query', privatefaktapp?: { __typename?: 'PrivateFaktApplication', id: string, clientId: string, clientSecret: string, scopes?: any | null, version: string, identifier: string } | null };

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

export type ScopesQueryVariables = Exact<{ [key: string]: never; }>;


export type ScopesQuery = { __typename?: 'Query', scopes?: Array<{ __typename?: 'Scope', description?: string | null, value: string, label: string } | null> | null };

export type ScopesOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ScopesOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Scope', value: string, label: string } | null> | null };

export type LokGlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type LokGlobalSearchQuery = { __typename?: 'Query', apps?: Array<{ __typename?: 'App', id: string, identifier: string, version: string, logo?: string | null } | null> | null, users?: Array<{ __typename?: 'HerreUser', username: string, firstName: string, lastName: string, email: string, id: string, profile?: { __typename?: 'Profile', avatar?: string | null } | null } | null> | null, groups?: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', avatar?: string | null, name?: string | null } | null } | null> | null };

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

export const DetailAppFragmentDoc = gql`
    fragment DetailApp on App {
  id
  identifier
  version
  logo
}
    `;
export const ListAppFragmentDoc = gql`
    fragment ListApp on App {
  id
  identifier
  version
  logo
}
    `;
export const DetailApplicationFragmentDoc = gql`
    fragment DetailApplication on Application {
  id
  clientId
  authorizationGrantType
  name
  image
  user {
    username
  }
  created
  redirectUris
}
    `;
export const ListApplicationFragmentDoc = gql`
    fragment ListApplication on Application {
  id
  clientId
  name
  user {
    username
  }
  created
  redirectUris
}
    `;
export const PrivateFaktFragmentDoc = gql`
    fragment PrivateFakt on PrivateFaktApplication {
  id
  clientId
  clientSecret
  scopes
  version
  identifier
}
    `;
export const PublicFaktFragmentDoc = gql`
    fragment PublicFakt on PublicFaktApplication {
  id
  clientId
  clientSecret
  scopes
  version
  identifier
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
export const CreateApplicationDocument = gql`
    mutation CreateApplication($grantType: GrantType!, $name: String!, $redirectUris: [String]) {
  createApplication(
    grantType: $grantType
    name: $name
    redirectUris: $redirectUris
  ) {
    ...DetailApplication
  }
}
    ${DetailApplicationFragmentDoc}`;
export type CreateApplicationMutationFn = Apollo.MutationFunction<CreateApplicationMutation, CreateApplicationMutationVariables>;

/**
 * __useCreateApplicationMutation__
 *
 * To run a mutation, you first call `useCreateApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createApplicationMutation, { data, loading, error }] = useCreateApplicationMutation({
 *   variables: {
 *      grantType: // value for 'grantType'
 *      name: // value for 'name'
 *      redirectUris: // value for 'redirectUris'
 *   },
 * });
 */
export function useCreateApplicationMutation(baseOptions?: Apollo.MutationHookOptions<CreateApplicationMutation, CreateApplicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateApplicationMutation, CreateApplicationMutationVariables>(CreateApplicationDocument, options);
      }
export type CreateApplicationMutationHookResult = ReturnType<typeof useCreateApplicationMutation>;
export type CreateApplicationMutationResult = Apollo.MutationResult<CreateApplicationMutation>;
export type CreateApplicationMutationOptions = Apollo.BaseMutationOptions<CreateApplicationMutation, CreateApplicationMutationVariables>;
export const CreateUserLoginAppDocument = gql`
    mutation CreateUserLoginApp($name: String!, $redirectUris: [String]) {
  createUserLoginApp(name: $name, redirectUris: $redirectUris) {
    ...DetailApplication
  }
}
    ${DetailApplicationFragmentDoc}`;
export type CreateUserLoginAppMutationFn = Apollo.MutationFunction<CreateUserLoginAppMutation, CreateUserLoginAppMutationVariables>;

/**
 * __useCreateUserLoginAppMutation__
 *
 * To run a mutation, you first call `useCreateUserLoginAppMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUserLoginAppMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUserLoginAppMutation, { data, loading, error }] = useCreateUserLoginAppMutation({
 *   variables: {
 *      name: // value for 'name'
 *      redirectUris: // value for 'redirectUris'
 *   },
 * });
 */
export function useCreateUserLoginAppMutation(baseOptions?: Apollo.MutationHookOptions<CreateUserLoginAppMutation, CreateUserLoginAppMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateUserLoginAppMutation, CreateUserLoginAppMutationVariables>(CreateUserLoginAppDocument, options);
      }
export type CreateUserLoginAppMutationHookResult = ReturnType<typeof useCreateUserLoginAppMutation>;
export type CreateUserLoginAppMutationResult = Apollo.MutationResult<CreateUserLoginAppMutation>;
export type CreateUserLoginAppMutationOptions = Apollo.BaseMutationOptions<CreateUserLoginAppMutation, CreateUserLoginAppMutationVariables>;
export const CreateUserAppDocument = gql`
    mutation CreateUserApp($name: String!, $identifier: String!, $version: String!) {
  createUserApp(name: $name, identifier: $identifier, version: $version) {
    clientSecret
    clientId
  }
}
    `;
export type CreateUserAppMutationFn = Apollo.MutationFunction<CreateUserAppMutation, CreateUserAppMutationVariables>;

/**
 * __useCreateUserAppMutation__
 *
 * To run a mutation, you first call `useCreateUserAppMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUserAppMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUserAppMutation, { data, loading, error }] = useCreateUserAppMutation({
 *   variables: {
 *      name: // value for 'name'
 *      identifier: // value for 'identifier'
 *      version: // value for 'version'
 *   },
 * });
 */
export function useCreateUserAppMutation(baseOptions?: Apollo.MutationHookOptions<CreateUserAppMutation, CreateUserAppMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateUserAppMutation, CreateUserAppMutationVariables>(CreateUserAppDocument, options);
      }
export type CreateUserAppMutationHookResult = ReturnType<typeof useCreateUserAppMutation>;
export type CreateUserAppMutationResult = Apollo.MutationResult<CreateUserAppMutation>;
export type CreateUserAppMutationOptions = Apollo.BaseMutationOptions<CreateUserAppMutation, CreateUserAppMutationVariables>;
export const DeleteApplicationDocument = gql`
    mutation DeleteApplication($clientId: ID!) {
  deleteApplication(clientId: $clientId) {
    clientId
  }
}
    `;
export type DeleteApplicationMutationFn = Apollo.MutationFunction<DeleteApplicationMutation, DeleteApplicationMutationVariables>;

/**
 * __useDeleteApplicationMutation__
 *
 * To run a mutation, you first call `useDeleteApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteApplicationMutation, { data, loading, error }] = useDeleteApplicationMutation({
 *   variables: {
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useDeleteApplicationMutation(baseOptions?: Apollo.MutationHookOptions<DeleteApplicationMutation, DeleteApplicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteApplicationMutation, DeleteApplicationMutationVariables>(DeleteApplicationDocument, options);
      }
export type DeleteApplicationMutationHookResult = ReturnType<typeof useDeleteApplicationMutation>;
export type DeleteApplicationMutationResult = Apollo.MutationResult<DeleteApplicationMutation>;
export type DeleteApplicationMutationOptions = Apollo.BaseMutationOptions<DeleteApplicationMutation, DeleteApplicationMutationVariables>;
export const CreatePrivateFaktDocument = gql`
    mutation CreatePrivateFakt($identifier: String!, $version: String!, $scopes: [String!]!) {
  createPrivateFakt(identifier: $identifier, version: $version, scopes: $scopes) {
    ...PrivateFakt
  }
}
    ${PrivateFaktFragmentDoc}`;
export type CreatePrivateFaktMutationFn = Apollo.MutationFunction<CreatePrivateFaktMutation, CreatePrivateFaktMutationVariables>;

/**
 * __useCreatePrivateFaktMutation__
 *
 * To run a mutation, you first call `useCreatePrivateFaktMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePrivateFaktMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPrivateFaktMutation, { data, loading, error }] = useCreatePrivateFaktMutation({
 *   variables: {
 *      identifier: // value for 'identifier'
 *      version: // value for 'version'
 *      scopes: // value for 'scopes'
 *   },
 * });
 */
export function useCreatePrivateFaktMutation(baseOptions?: Apollo.MutationHookOptions<CreatePrivateFaktMutation, CreatePrivateFaktMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePrivateFaktMutation, CreatePrivateFaktMutationVariables>(CreatePrivateFaktDocument, options);
      }
export type CreatePrivateFaktMutationHookResult = ReturnType<typeof useCreatePrivateFaktMutation>;
export type CreatePrivateFaktMutationResult = Apollo.MutationResult<CreatePrivateFaktMutation>;
export type CreatePrivateFaktMutationOptions = Apollo.BaseMutationOptions<CreatePrivateFaktMutation, CreatePrivateFaktMutationVariables>;
export const CreatePublicFaktDocument = gql`
    mutation CreatePublicFakt($identifier: String!, $version: String!, $redirectUris: [String!]!, $scopes: [String!]!) {
  createPublicFakt(
    identifier: $identifier
    version: $version
    redirectUris: $redirectUris
    scopes: $scopes
  ) {
    id
    clientId
    clientSecret
  }
}
    `;
export type CreatePublicFaktMutationFn = Apollo.MutationFunction<CreatePublicFaktMutation, CreatePublicFaktMutationVariables>;

/**
 * __useCreatePublicFaktMutation__
 *
 * To run a mutation, you first call `useCreatePublicFaktMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePublicFaktMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPublicFaktMutation, { data, loading, error }] = useCreatePublicFaktMutation({
 *   variables: {
 *      identifier: // value for 'identifier'
 *      version: // value for 'version'
 *      redirectUris: // value for 'redirectUris'
 *      scopes: // value for 'scopes'
 *   },
 * });
 */
export function useCreatePublicFaktMutation(baseOptions?: Apollo.MutationHookOptions<CreatePublicFaktMutation, CreatePublicFaktMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePublicFaktMutation, CreatePublicFaktMutationVariables>(CreatePublicFaktDocument, options);
      }
export type CreatePublicFaktMutationHookResult = ReturnType<typeof useCreatePublicFaktMutation>;
export type CreatePublicFaktMutationResult = Apollo.MutationResult<CreatePublicFaktMutation>;
export type CreatePublicFaktMutationOptions = Apollo.BaseMutationOptions<CreatePublicFaktMutation, CreatePublicFaktMutationVariables>;
export const DeletePublicFaktDocument = gql`
    mutation DeletePublicFakt($id: ID!) {
  deletePublicFakt(id: $id) {
    id
  }
}
    `;
export type DeletePublicFaktMutationFn = Apollo.MutationFunction<DeletePublicFaktMutation, DeletePublicFaktMutationVariables>;

/**
 * __useDeletePublicFaktMutation__
 *
 * To run a mutation, you first call `useDeletePublicFaktMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePublicFaktMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePublicFaktMutation, { data, loading, error }] = useDeletePublicFaktMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeletePublicFaktMutation(baseOptions?: Apollo.MutationHookOptions<DeletePublicFaktMutation, DeletePublicFaktMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeletePublicFaktMutation, DeletePublicFaktMutationVariables>(DeletePublicFaktDocument, options);
      }
export type DeletePublicFaktMutationHookResult = ReturnType<typeof useDeletePublicFaktMutation>;
export type DeletePublicFaktMutationResult = Apollo.MutationResult<DeletePublicFaktMutation>;
export type DeletePublicFaktMutationOptions = Apollo.BaseMutationOptions<DeletePublicFaktMutation, DeletePublicFaktMutationVariables>;
export const DeletePrivateFaktDocument = gql`
    mutation DeletePrivateFakt($id: ID!) {
  deletePrivateFakt(id: $id) {
    id
  }
}
    `;
export type DeletePrivateFaktMutationFn = Apollo.MutationFunction<DeletePrivateFaktMutation, DeletePrivateFaktMutationVariables>;

/**
 * __useDeletePrivateFaktMutation__
 *
 * To run a mutation, you first call `useDeletePrivateFaktMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePrivateFaktMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePrivateFaktMutation, { data, loading, error }] = useDeletePrivateFaktMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeletePrivateFaktMutation(baseOptions?: Apollo.MutationHookOptions<DeletePrivateFaktMutation, DeletePrivateFaktMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeletePrivateFaktMutation, DeletePrivateFaktMutationVariables>(DeletePrivateFaktDocument, options);
      }
export type DeletePrivateFaktMutationHookResult = ReturnType<typeof useDeletePrivateFaktMutation>;
export type DeletePrivateFaktMutationResult = Apollo.MutationResult<DeletePrivateFaktMutation>;
export type DeletePrivateFaktMutationOptions = Apollo.BaseMutationOptions<DeletePrivateFaktMutation, DeletePrivateFaktMutationVariables>;
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
    query App($identifier: String, $version: String, $id: ID, $clientId: String) {
  app(identifier: $identifier, version: $version, id: $id, clientId: $clientId) {
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
 *      version: // value for 'version'
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
export const ApplicationsDocument = gql`
    query Applications {
  applications {
    ...DetailApplication
  }
}
    ${DetailApplicationFragmentDoc}`;

/**
 * __useApplicationsQuery__
 *
 * To run a query within a React component, call `useApplicationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useApplicationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useApplicationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useApplicationsQuery(baseOptions?: Apollo.QueryHookOptions<ApplicationsQuery, ApplicationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ApplicationsQuery, ApplicationsQueryVariables>(ApplicationsDocument, options);
      }
export function useApplicationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ApplicationsQuery, ApplicationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ApplicationsQuery, ApplicationsQueryVariables>(ApplicationsDocument, options);
        }
export type ApplicationsQueryHookResult = ReturnType<typeof useApplicationsQuery>;
export type ApplicationsLazyQueryHookResult = ReturnType<typeof useApplicationsLazyQuery>;
export type ApplicationsQueryResult = Apollo.QueryResult<ApplicationsQuery, ApplicationsQueryVariables>;
export const DetailApplicationDocument = gql`
    query DetailApplication($clientId: ID!) {
  application(clientId: $clientId) {
    ...DetailApplication
  }
}
    ${DetailApplicationFragmentDoc}`;

/**
 * __useDetailApplicationQuery__
 *
 * To run a query within a React component, call `useDetailApplicationQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailApplicationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailApplicationQuery({
 *   variables: {
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useDetailApplicationQuery(baseOptions: Apollo.QueryHookOptions<DetailApplicationQuery, DetailApplicationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailApplicationQuery, DetailApplicationQueryVariables>(DetailApplicationDocument, options);
      }
export function useDetailApplicationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailApplicationQuery, DetailApplicationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailApplicationQuery, DetailApplicationQueryVariables>(DetailApplicationDocument, options);
        }
export type DetailApplicationQueryHookResult = ReturnType<typeof useDetailApplicationQuery>;
export type DetailApplicationLazyQueryHookResult = ReturnType<typeof useDetailApplicationLazyQuery>;
export type DetailApplicationQueryResult = Apollo.QueryResult<DetailApplicationQuery, DetailApplicationQueryVariables>;
export const DetailUserApplicationDocument = gql`
    query DetailUserApplication($clientId: ID, $name: String) {
  userapp(clientId: $clientId, name: $name) {
    ...DetailApplication
  }
}
    ${DetailApplicationFragmentDoc}`;

/**
 * __useDetailUserApplicationQuery__
 *
 * To run a query within a React component, call `useDetailUserApplicationQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailUserApplicationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailUserApplicationQuery({
 *   variables: {
 *      clientId: // value for 'clientId'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useDetailUserApplicationQuery(baseOptions?: Apollo.QueryHookOptions<DetailUserApplicationQuery, DetailUserApplicationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailUserApplicationQuery, DetailUserApplicationQueryVariables>(DetailUserApplicationDocument, options);
      }
export function useDetailUserApplicationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailUserApplicationQuery, DetailUserApplicationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailUserApplicationQuery, DetailUserApplicationQueryVariables>(DetailUserApplicationDocument, options);
        }
export type DetailUserApplicationQueryHookResult = ReturnType<typeof useDetailUserApplicationQuery>;
export type DetailUserApplicationLazyQueryHookResult = ReturnType<typeof useDetailUserApplicationLazyQuery>;
export type DetailUserApplicationQueryResult = Apollo.QueryResult<DetailUserApplicationQuery, DetailUserApplicationQueryVariables>;
export const PublicFaktsDocument = gql`
    query PublicFakts {
  publicfaktapps {
    ...PublicFakt
  }
}
    ${PublicFaktFragmentDoc}`;

/**
 * __usePublicFaktsQuery__
 *
 * To run a query within a React component, call `usePublicFaktsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePublicFaktsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePublicFaktsQuery({
 *   variables: {
 *   },
 * });
 */
export function usePublicFaktsQuery(baseOptions?: Apollo.QueryHookOptions<PublicFaktsQuery, PublicFaktsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PublicFaktsQuery, PublicFaktsQueryVariables>(PublicFaktsDocument, options);
      }
export function usePublicFaktsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PublicFaktsQuery, PublicFaktsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PublicFaktsQuery, PublicFaktsQueryVariables>(PublicFaktsDocument, options);
        }
export type PublicFaktsQueryHookResult = ReturnType<typeof usePublicFaktsQuery>;
export type PublicFaktsLazyQueryHookResult = ReturnType<typeof usePublicFaktsLazyQuery>;
export type PublicFaktsQueryResult = Apollo.QueryResult<PublicFaktsQuery, PublicFaktsQueryVariables>;
export const PublicFaktDocument = gql`
    query PublicFakt($id: ID!) {
  publicfaktapp(id: $id) {
    ...PublicFakt
  }
}
    ${PublicFaktFragmentDoc}`;

/**
 * __usePublicFaktQuery__
 *
 * To run a query within a React component, call `usePublicFaktQuery` and pass it any options that fit your needs.
 * When your component renders, `usePublicFaktQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePublicFaktQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePublicFaktQuery(baseOptions: Apollo.QueryHookOptions<PublicFaktQuery, PublicFaktQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PublicFaktQuery, PublicFaktQueryVariables>(PublicFaktDocument, options);
      }
export function usePublicFaktLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PublicFaktQuery, PublicFaktQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PublicFaktQuery, PublicFaktQueryVariables>(PublicFaktDocument, options);
        }
export type PublicFaktQueryHookResult = ReturnType<typeof usePublicFaktQuery>;
export type PublicFaktLazyQueryHookResult = ReturnType<typeof usePublicFaktLazyQuery>;
export type PublicFaktQueryResult = Apollo.QueryResult<PublicFaktQuery, PublicFaktQueryVariables>;
export const PrivateFaktsDocument = gql`
    query PrivateFakts {
  privatefaktapps {
    ...PrivateFakt
  }
}
    ${PrivateFaktFragmentDoc}`;

/**
 * __usePrivateFaktsQuery__
 *
 * To run a query within a React component, call `usePrivateFaktsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePrivateFaktsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePrivateFaktsQuery({
 *   variables: {
 *   },
 * });
 */
export function usePrivateFaktsQuery(baseOptions?: Apollo.QueryHookOptions<PrivateFaktsQuery, PrivateFaktsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PrivateFaktsQuery, PrivateFaktsQueryVariables>(PrivateFaktsDocument, options);
      }
export function usePrivateFaktsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PrivateFaktsQuery, PrivateFaktsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PrivateFaktsQuery, PrivateFaktsQueryVariables>(PrivateFaktsDocument, options);
        }
export type PrivateFaktsQueryHookResult = ReturnType<typeof usePrivateFaktsQuery>;
export type PrivateFaktsLazyQueryHookResult = ReturnType<typeof usePrivateFaktsLazyQuery>;
export type PrivateFaktsQueryResult = Apollo.QueryResult<PrivateFaktsQuery, PrivateFaktsQueryVariables>;
export const PrivateFaktDocument = gql`
    query PrivateFakt($id: ID!) {
  privatefaktapp(id: $id) {
    ...PrivateFakt
  }
}
    ${PrivateFaktFragmentDoc}`;

/**
 * __usePrivateFaktQuery__
 *
 * To run a query within a React component, call `usePrivateFaktQuery` and pass it any options that fit your needs.
 * When your component renders, `usePrivateFaktQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePrivateFaktQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePrivateFaktQuery(baseOptions: Apollo.QueryHookOptions<PrivateFaktQuery, PrivateFaktQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PrivateFaktQuery, PrivateFaktQueryVariables>(PrivateFaktDocument, options);
      }
export function usePrivateFaktLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PrivateFaktQuery, PrivateFaktQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PrivateFaktQuery, PrivateFaktQueryVariables>(PrivateFaktDocument, options);
        }
export type PrivateFaktQueryHookResult = ReturnType<typeof usePrivateFaktQuery>;
export type PrivateFaktLazyQueryHookResult = ReturnType<typeof usePrivateFaktLazyQuery>;
export type PrivateFaktQueryResult = Apollo.QueryResult<PrivateFaktQuery, PrivateFaktQueryVariables>;
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
  options: users(username: $search) {
    value: email
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