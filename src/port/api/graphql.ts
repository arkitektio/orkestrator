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
  DateTime: any;
  GenericScalar: any;
};

export type Container = {
  __typename?: 'Container';
  attrs?: Maybe<Scalars['GenericScalar']>;
  id: Scalars['ID'];
  image?: Maybe<Image>;
  labels?: Maybe<Scalars['GenericScalar']>;
  logs?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  network?: Maybe<Network>;
  runtime?: Maybe<DockerRuntime>;
  status?: Maybe<ContainerStatus>;
  whale?: Maybe<Whale>;
};


export type ContainerLogsArgs = {
  follow?: InputMaybe<Scalars['Boolean']>;
  since?: InputMaybe<Scalars['String']>;
  stderr?: InputMaybe<Scalars['Boolean']>;
  stdout?: InputMaybe<Scalars['Boolean']>;
  tail?: InputMaybe<Scalars['Int']>;
  timestamps?: InputMaybe<Scalars['Boolean']>;
  until?: InputMaybe<Scalars['String']>;
};

export enum ContainerStatus {
  Created = 'CREATED',
  Dead = 'DEAD',
  Exited = 'EXITED',
  Paused = 'PAUSED',
  Removing = 'REMOVING',
  Restarting = 'RESTARTING',
  Running = 'RUNNING'
}

export type DeleteGithubRepoReturn = {
  __typename?: 'DeleteGithubRepoReturn';
  /** Hallo */
  id?: Maybe<Scalars['ID']>;
};

export type DeleteWhaleReturn = {
  __typename?: 'DeleteWhaleReturn';
  /** Hallo */
  id?: Maybe<Scalars['ID']>;
};

export type Deployment = {
  __typename?: 'Deployment';
  command?: Maybe<Scalars['String']>;
  createdAt: Scalars['DateTime'];
  deployedAt: Scalars['DateTime'];
  id: Scalars['ID'];
  identifier: Scalars['String'];
  image: Scalars['String'];
  repo?: Maybe<GithubRepo>;
  requirements?: Maybe<Scalars['GenericScalar']>;
  scopes?: Maybe<Scalars['GenericScalar']>;
  version: Scalars['String'];
  whales: Array<Whale>;
};

/** Docker runtime. */
export enum DockerRuntime {
  Nvidia = 'NVIDIA',
  Runc = 'RUNC'
}

export type GithubRepo = {
  __typename?: 'GithubRepo';
  branch: Scalars['String'];
  createdAt: Scalars['DateTime'];
  deployments: Array<Deployment>;
  id: Scalars['ID'];
  identifier: Scalars['String'];
  readme?: Maybe<Scalars['String']>;
  repo: Scalars['String'];
  scopes: Array<Maybe<Scalars['String']>>;
  user: Scalars['String'];
  version: Scalars['String'];
};

export type Image = {
  __typename?: 'Image';
  attrs?: Maybe<Scalars['GenericScalar']>;
  id: Scalars['String'];
  labels?: Maybe<Scalars['GenericScalar']>;
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};

/** The root Mutation */
export type Mutation = {
  __typename?: 'Mutation';
  createGithubRepo?: Maybe<GithubRepo>;
  createWhale?: Maybe<Whale>;
  deleteGithubRepo?: Maybe<DeleteGithubRepoReturn>;
  deleteWhale?: Maybe<DeleteWhaleReturn>;
  pullWhale?: Maybe<PullWhaleReturn>;
  removeContainer?: Maybe<Container>;
  restartContainer?: Maybe<Container>;
  runWhale?: Maybe<Container>;
  scanRepo?: Maybe<Deployment>;
  stopContainer?: Maybe<Container>;
};


/** The root Mutation */
export type MutationCreateGithubRepoArgs = {
  branch: Scalars['String'];
  repo: Scalars['String'];
  user: Scalars['String'];
};


/** The root Mutation */
export type MutationCreateWhaleArgs = {
  clientId: Scalars['String'];
  deployment: Scalars['ID'];
  faktEndpoint?: InputMaybe<Scalars['String']>;
  token: Scalars['String'];
};


/** The root Mutation */
export type MutationDeleteGithubRepoArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Mutation */
export type MutationDeleteWhaleArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Mutation */
export type MutationPullWhaleArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Mutation */
export type MutationRemoveContainerArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationRestartContainerArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationRunWhaleArgs = {
  command?: InputMaybe<Scalars['String']>;
  id: Scalars['ID'];
  instance?: InputMaybe<Scalars['String']>;
  network?: InputMaybe<Scalars['ID']>;
  runtime?: InputMaybe<DockerRuntime>;
};


/** The root Mutation */
export type MutationScanRepoArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationStopContainerArgs = {
  id: Scalars['ID'];
};

export type Network = {
  __typename?: 'Network';
  containers?: Maybe<Array<Maybe<Container>>>;
  driver?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  internal?: Maybe<Scalars['Boolean']>;
  ipam?: Maybe<Scalars['GenericScalar']>;
  labels?: Maybe<Scalars['GenericScalar']>;
  name?: Maybe<Scalars['String']>;
  options?: Maybe<Scalars['GenericScalar']>;
  scope?: Maybe<Scalars['String']>;
};

export type PullWhaleReturn = {
  __typename?: 'PullWhaleReturn';
  /** Hallo */
  id?: Maybe<Scalars['ID']>;
};

/** The root Query */
export type Query = {
  __typename?: 'Query';
  /**
   * Get a single docker by ID
   *
   *     Returns a single feature by ID. If the user does not have access
   *     to the feature, an error will be raised.
   *
   */
  container?: Maybe<Container>;
  /**
   * Get a single docker by ID
   *
   *     Returns a single feature by ID. If the user does not have access
   *     to the feature, an error will be raised.
   *
   */
  containerFor?: Maybe<Container>;
  /**
   * Get a single feature by ID
   *
   *     Returns a single feature by ID. If the user does not have access
   *     to the feature, an error will be raised.
   *
   */
  containers?: Maybe<Array<Maybe<Container>>>;
  /**
   * Get a single docker by ID
   *
   *     Returns a single feature by ID. If the user does not have access
   *     to the feature, an error will be raised.
   *
   */
  deployment?: Maybe<Deployment>;
  /**
   * Get a single feature by ID
   *
   *     Returns a single feature by ID. If the user does not have access
   *     to the feature, an error will be raised.
   *
   */
  deployments?: Maybe<Array<Maybe<Deployment>>>;
  /** Get information on your Docker Template */
  githubRepo?: Maybe<GithubRepo>;
  githubRepos?: Maybe<Array<Maybe<GithubRepo>>>;
  hello?: Maybe<Scalars['String']>;
  /**
   * Get a single feature by ID
   *
   *     Returns a single feature by ID. If the user does not have access
   *     to the feature, an error will be raised.
   *
   */
  networks?: Maybe<Array<Maybe<Network>>>;
  void?: Maybe<Scalars['String']>;
  /** Get information on your Docker Template */
  whale?: Maybe<Whale>;
  whales?: Maybe<Array<Maybe<Whale>>>;
};


/** The root Query */
export type QueryContainerArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryContainerForArgs = {
  instance?: InputMaybe<Scalars['String']>;
  whale: Scalars['ID'];
};


/** The root Query */
export type QueryContainersArgs = {
  search?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<Array<InputMaybe<ContainerStatus>>>;
};


/** The root Query */
export type QueryDeploymentArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryGithubRepoArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryGithubReposArgs = {
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryNetworksArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryWhaleArgs = {
  id?: InputMaybe<Scalars['ID']>;
  template?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryWhalesArgs = {
  search?: InputMaybe<Scalars['String']>;
};

export type Whale = {
  __typename?: 'Whale';
  clientId: Scalars['String'];
  containers?: Maybe<Array<Maybe<Container>>>;
  createdAt: Scalars['DateTime'];
  deployment: Deployment;
  id: Scalars['ID'];
  latestPull?: Maybe<Scalars['DateTime']>;
  pulled?: Maybe<Scalars['Boolean']>;
  token?: Maybe<Scalars['String']>;
  url: Scalars['String'];
};

export type DetailContainerFragment = { __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null, whale?: { __typename?: 'Whale', id: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null }, containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null } | null> | null } | null };

export type ListContainerFragment = { __typename?: 'Container', id: string, name?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null, whale?: { __typename?: 'Whale', id: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null }, containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null } | null> | null } | null };

export type DetailDeploymentFragment = { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null };

export type ListDeploymentFragment = { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, command?: string | null, whales: Array<{ __typename?: 'Whale', id: string }> };

export type DetailImageFragment = { __typename?: 'Image', tags?: Array<string | null> | null };

export type DetailNetworkFragment = { __typename?: 'Network', name?: string | null, id: string };

export type DetailGithubRepoFragment = { __typename?: 'GithubRepo', id: string, user: string, repo: string, branch: string, readme?: string | null, deployments: Array<{ __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, command?: string | null, whales: Array<{ __typename?: 'Whale', id: string }> }> };

export type ListGithubRepoFragment = { __typename?: 'GithubRepo', id: string, user: string, repo: string, branch: string };

export type DetailWhaleFragment = { __typename?: 'Whale', id: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null }, containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null } | null> | null };

export type ListWhaleFragment = { __typename?: 'Whale', id: string, createdAt: any, clientId: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, command?: string | null, whales: Array<{ __typename?: 'Whale', id: string }> } };

export type StopContainerMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type StopContainerMutation = { __typename?: 'Mutation', stopContainer?: { __typename?: 'Container', id: string, name?: string | null, status?: ContainerStatus | null } | null };

export type RemoveContainerMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type RemoveContainerMutation = { __typename?: 'Mutation', removeContainer?: { __typename?: 'Container', id: string, name?: string | null, status?: ContainerStatus | null } | null };

export type RestartContainerMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type RestartContainerMutation = { __typename?: 'Mutation', restartContainer?: { __typename?: 'Container', id: string, name?: string | null, status?: ContainerStatus | null } | null };

export type DeleteGithubRepoMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteGithubRepoMutation = { __typename?: 'Mutation', deleteGithubRepo?: { __typename?: 'DeleteGithubRepoReturn', id?: string | null } | null };

export type CreateGithubRepoMutationVariables = Exact<{
  repo: Scalars['String'];
  user: Scalars['String'];
  branch: Scalars['String'];
}>;


export type CreateGithubRepoMutation = { __typename?: 'Mutation', createGithubRepo?: { __typename?: 'GithubRepo', id: string, user: string, repo: string, branch: string } | null };

export type ScanRepoMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type ScanRepoMutation = { __typename?: 'Mutation', scanRepo?: { __typename?: 'Deployment', id: string, identifier: string, version: string } | null };

export type RunWhaleMutationVariables = Exact<{
  id: Scalars['ID'];
  instance?: InputMaybe<Scalars['String']>;
}>;


export type RunWhaleMutation = { __typename?: 'Mutation', runWhale?: { __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null, whale?: { __typename?: 'Whale', id: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null }, containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null } | null> | null } | null } | null };

export type DeleteWhaleMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteWhaleMutation = { __typename?: 'Mutation', deleteWhale?: { __typename?: 'DeleteWhaleReturn', id?: string | null } | null };

export type PullWhaleMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type PullWhaleMutation = { __typename?: 'Mutation', pullWhale?: { __typename?: 'PullWhaleReturn', id?: string | null } | null };

export type CreateWhaleMutationVariables = Exact<{
  deployment: Scalars['ID'];
  clientId: Scalars['String'];
  token: Scalars['String'];
  faktEndpoint?: InputMaybe<Scalars['String']>;
}>;


export type CreateWhaleMutation = { __typename?: 'Mutation', createWhale?: { __typename?: 'Whale', id: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null }, containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null } | null> | null } | null };

export type ContainersQueryVariables = Exact<{
  status?: InputMaybe<Array<InputMaybe<ContainerStatus>> | InputMaybe<ContainerStatus>>;
}>;


export type ContainersQuery = { __typename?: 'Query', containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null, whale?: { __typename?: 'Whale', id: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null }, containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null } | null> | null } | null } | null> | null };

export type DetailContainerQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailContainerQuery = { __typename?: 'Query', container?: { __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null, whale?: { __typename?: 'Whale', id: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null }, containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null } | null> | null } | null } | null };

export type DeploymentsQueryVariables = Exact<{ [key: string]: never; }>;


export type DeploymentsQuery = { __typename?: 'Query', deployments?: Array<{ __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, command?: string | null, whales: Array<{ __typename?: 'Whale', id: string }> } | null> | null };

export type DetailDeploymentQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailDeploymentQuery = { __typename?: 'Query', deployment?: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null } | null };

export type GithubReposQueryVariables = Exact<{ [key: string]: never; }>;


export type GithubReposQuery = { __typename?: 'Query', githubRepos?: Array<{ __typename?: 'GithubRepo', id: string, user: string, repo: string, branch: string } | null> | null };

export type DetailGithubRepoQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailGithubRepoQuery = { __typename?: 'Query', githubRepo?: { __typename?: 'GithubRepo', id: string, user: string, repo: string, branch: string, readme?: string | null, deployments: Array<{ __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, command?: string | null, whales: Array<{ __typename?: 'Whale', id: string }> }> } | null };

export type PortGlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type PortGlobalSearchQuery = { __typename?: 'Query', containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null, whale?: { __typename?: 'Whale', id: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null }, containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null } | null> | null } | null } | null> | null, whales?: Array<{ __typename?: 'Whale', id: string, createdAt: any, clientId: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, command?: string | null, whales: Array<{ __typename?: 'Whale', id: string }> } } | null> | null };

export type DetailWhaleQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailWhaleQuery = { __typename?: 'Query', whale?: { __typename?: 'Whale', id: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, requirements?: any | null, command?: string | null }, containers?: Array<{ __typename?: 'Container', id: string, name?: string | null, logs?: string | null, labels?: any | null, status?: ContainerStatus | null, image?: { __typename?: 'Image', tags?: Array<string | null> | null } | null } | null> | null } | null };

export type WhalesQueryVariables = Exact<{ [key: string]: never; }>;


export type WhalesQuery = { __typename?: 'Query', whales?: Array<{ __typename?: 'Whale', id: string, createdAt: any, clientId: string, pulled?: boolean | null, latestPull?: any | null, deployment: { __typename?: 'Deployment', id: string, identifier: string, version: string, scopes?: any | null, image: string, command?: string | null, whales: Array<{ __typename?: 'Whale', id: string }> } } | null> | null };

export const DetailImageFragmentDoc = gql`
    fragment DetailImage on Image {
  tags
}
    `;
export const DetailDeploymentFragmentDoc = gql`
    fragment DetailDeployment on Deployment {
  id
  identifier
  version
  scopes
  image
  requirements
  command
}
    `;
export const DetailWhaleFragmentDoc = gql`
    fragment DetailWhale on Whale {
  id
  deployment {
    ...DetailDeployment
  }
  pulled
  latestPull
  containers {
    id
    name
    image {
      ...DetailImage
    }
    logs
    labels
    status
  }
}
    ${DetailDeploymentFragmentDoc}
${DetailImageFragmentDoc}`;
export const DetailContainerFragmentDoc = gql`
    fragment DetailContainer on Container {
  id
  name
  image {
    ...DetailImage
  }
  logs
  labels
  status
  whale {
    ...DetailWhale
  }
}
    ${DetailImageFragmentDoc}
${DetailWhaleFragmentDoc}`;
export const ListContainerFragmentDoc = gql`
    fragment ListContainer on Container {
  id
  name
  image {
    ...DetailImage
  }
  labels
  status
  whale {
    ...DetailWhale
  }
}
    ${DetailImageFragmentDoc}
${DetailWhaleFragmentDoc}`;
export const DetailNetworkFragmentDoc = gql`
    fragment DetailNetwork on Network {
  name
  id
}
    `;
export const ListDeploymentFragmentDoc = gql`
    fragment ListDeployment on Deployment {
  id
  identifier
  version
  scopes
  image
  whales {
    id
  }
  command
}
    `;
export const DetailGithubRepoFragmentDoc = gql`
    fragment DetailGithubRepo on GithubRepo {
  id
  user
  repo
  branch
  deployments {
    ...ListDeployment
  }
  readme
}
    ${ListDeploymentFragmentDoc}`;
export const ListGithubRepoFragmentDoc = gql`
    fragment ListGithubRepo on GithubRepo {
  id
  user
  repo
  branch
}
    `;
export const ListWhaleFragmentDoc = gql`
    fragment ListWhale on Whale {
  id
  createdAt
  deployment {
    ...ListDeployment
  }
  clientId
  pulled
  latestPull
}
    ${ListDeploymentFragmentDoc}`;
export const StopContainerDocument = gql`
    mutation StopContainer($id: ID!) {
  stopContainer(id: $id) {
    id
    name
    status
  }
}
    `;
export type StopContainerMutationFn = Apollo.MutationFunction<StopContainerMutation, StopContainerMutationVariables>;

/**
 * __useStopContainerMutation__
 *
 * To run a mutation, you first call `useStopContainerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStopContainerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [stopContainerMutation, { data, loading, error }] = useStopContainerMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useStopContainerMutation(baseOptions?: Apollo.MutationHookOptions<StopContainerMutation, StopContainerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<StopContainerMutation, StopContainerMutationVariables>(StopContainerDocument, options);
      }
export type StopContainerMutationHookResult = ReturnType<typeof useStopContainerMutation>;
export type StopContainerMutationResult = Apollo.MutationResult<StopContainerMutation>;
export type StopContainerMutationOptions = Apollo.BaseMutationOptions<StopContainerMutation, StopContainerMutationVariables>;
export const RemoveContainerDocument = gql`
    mutation RemoveContainer($id: ID!) {
  removeContainer(id: $id) {
    id
    name
    status
  }
}
    `;
export type RemoveContainerMutationFn = Apollo.MutationFunction<RemoveContainerMutation, RemoveContainerMutationVariables>;

/**
 * __useRemoveContainerMutation__
 *
 * To run a mutation, you first call `useRemoveContainerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveContainerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeContainerMutation, { data, loading, error }] = useRemoveContainerMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveContainerMutation(baseOptions?: Apollo.MutationHookOptions<RemoveContainerMutation, RemoveContainerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveContainerMutation, RemoveContainerMutationVariables>(RemoveContainerDocument, options);
      }
export type RemoveContainerMutationHookResult = ReturnType<typeof useRemoveContainerMutation>;
export type RemoveContainerMutationResult = Apollo.MutationResult<RemoveContainerMutation>;
export type RemoveContainerMutationOptions = Apollo.BaseMutationOptions<RemoveContainerMutation, RemoveContainerMutationVariables>;
export const RestartContainerDocument = gql`
    mutation RestartContainer($id: ID!) {
  restartContainer(id: $id) {
    id
    name
    status
  }
}
    `;
export type RestartContainerMutationFn = Apollo.MutationFunction<RestartContainerMutation, RestartContainerMutationVariables>;

/**
 * __useRestartContainerMutation__
 *
 * To run a mutation, you first call `useRestartContainerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRestartContainerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [restartContainerMutation, { data, loading, error }] = useRestartContainerMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRestartContainerMutation(baseOptions?: Apollo.MutationHookOptions<RestartContainerMutation, RestartContainerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RestartContainerMutation, RestartContainerMutationVariables>(RestartContainerDocument, options);
      }
export type RestartContainerMutationHookResult = ReturnType<typeof useRestartContainerMutation>;
export type RestartContainerMutationResult = Apollo.MutationResult<RestartContainerMutation>;
export type RestartContainerMutationOptions = Apollo.BaseMutationOptions<RestartContainerMutation, RestartContainerMutationVariables>;
export const DeleteGithubRepoDocument = gql`
    mutation DeleteGithubRepo($id: ID!) {
  deleteGithubRepo(id: $id) {
    id
  }
}
    `;
export type DeleteGithubRepoMutationFn = Apollo.MutationFunction<DeleteGithubRepoMutation, DeleteGithubRepoMutationVariables>;

/**
 * __useDeleteGithubRepoMutation__
 *
 * To run a mutation, you first call `useDeleteGithubRepoMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGithubRepoMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGithubRepoMutation, { data, loading, error }] = useDeleteGithubRepoMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGithubRepoMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGithubRepoMutation, DeleteGithubRepoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGithubRepoMutation, DeleteGithubRepoMutationVariables>(DeleteGithubRepoDocument, options);
      }
export type DeleteGithubRepoMutationHookResult = ReturnType<typeof useDeleteGithubRepoMutation>;
export type DeleteGithubRepoMutationResult = Apollo.MutationResult<DeleteGithubRepoMutation>;
export type DeleteGithubRepoMutationOptions = Apollo.BaseMutationOptions<DeleteGithubRepoMutation, DeleteGithubRepoMutationVariables>;
export const CreateGithubRepoDocument = gql`
    mutation CreateGithubRepo($repo: String!, $user: String!, $branch: String!) {
  createGithubRepo(repo: $repo, user: $user, branch: $branch) {
    ...ListGithubRepo
  }
}
    ${ListGithubRepoFragmentDoc}`;
export type CreateGithubRepoMutationFn = Apollo.MutationFunction<CreateGithubRepoMutation, CreateGithubRepoMutationVariables>;

/**
 * __useCreateGithubRepoMutation__
 *
 * To run a mutation, you first call `useCreateGithubRepoMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGithubRepoMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGithubRepoMutation, { data, loading, error }] = useCreateGithubRepoMutation({
 *   variables: {
 *      repo: // value for 'repo'
 *      user: // value for 'user'
 *      branch: // value for 'branch'
 *   },
 * });
 */
export function useCreateGithubRepoMutation(baseOptions?: Apollo.MutationHookOptions<CreateGithubRepoMutation, CreateGithubRepoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGithubRepoMutation, CreateGithubRepoMutationVariables>(CreateGithubRepoDocument, options);
      }
export type CreateGithubRepoMutationHookResult = ReturnType<typeof useCreateGithubRepoMutation>;
export type CreateGithubRepoMutationResult = Apollo.MutationResult<CreateGithubRepoMutation>;
export type CreateGithubRepoMutationOptions = Apollo.BaseMutationOptions<CreateGithubRepoMutation, CreateGithubRepoMutationVariables>;
export const ScanRepoDocument = gql`
    mutation ScanRepo($id: ID!) {
  scanRepo(id: $id) {
    id
    identifier
    version
  }
}
    `;
export type ScanRepoMutationFn = Apollo.MutationFunction<ScanRepoMutation, ScanRepoMutationVariables>;

/**
 * __useScanRepoMutation__
 *
 * To run a mutation, you first call `useScanRepoMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useScanRepoMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [scanRepoMutation, { data, loading, error }] = useScanRepoMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useScanRepoMutation(baseOptions?: Apollo.MutationHookOptions<ScanRepoMutation, ScanRepoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ScanRepoMutation, ScanRepoMutationVariables>(ScanRepoDocument, options);
      }
export type ScanRepoMutationHookResult = ReturnType<typeof useScanRepoMutation>;
export type ScanRepoMutationResult = Apollo.MutationResult<ScanRepoMutation>;
export type ScanRepoMutationOptions = Apollo.BaseMutationOptions<ScanRepoMutation, ScanRepoMutationVariables>;
export const RunWhaleDocument = gql`
    mutation RunWhale($id: ID!, $instance: String) {
  runWhale(id: $id, instance: $instance) {
    ...DetailContainer
  }
}
    ${DetailContainerFragmentDoc}`;
export type RunWhaleMutationFn = Apollo.MutationFunction<RunWhaleMutation, RunWhaleMutationVariables>;

/**
 * __useRunWhaleMutation__
 *
 * To run a mutation, you first call `useRunWhaleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRunWhaleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [runWhaleMutation, { data, loading, error }] = useRunWhaleMutation({
 *   variables: {
 *      id: // value for 'id'
 *      instance: // value for 'instance'
 *   },
 * });
 */
export function useRunWhaleMutation(baseOptions?: Apollo.MutationHookOptions<RunWhaleMutation, RunWhaleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RunWhaleMutation, RunWhaleMutationVariables>(RunWhaleDocument, options);
      }
export type RunWhaleMutationHookResult = ReturnType<typeof useRunWhaleMutation>;
export type RunWhaleMutationResult = Apollo.MutationResult<RunWhaleMutation>;
export type RunWhaleMutationOptions = Apollo.BaseMutationOptions<RunWhaleMutation, RunWhaleMutationVariables>;
export const DeleteWhaleDocument = gql`
    mutation DeleteWhale($id: ID!) {
  deleteWhale(id: $id) {
    id
  }
}
    `;
export type DeleteWhaleMutationFn = Apollo.MutationFunction<DeleteWhaleMutation, DeleteWhaleMutationVariables>;

/**
 * __useDeleteWhaleMutation__
 *
 * To run a mutation, you first call `useDeleteWhaleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteWhaleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteWhaleMutation, { data, loading, error }] = useDeleteWhaleMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteWhaleMutation(baseOptions?: Apollo.MutationHookOptions<DeleteWhaleMutation, DeleteWhaleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteWhaleMutation, DeleteWhaleMutationVariables>(DeleteWhaleDocument, options);
      }
export type DeleteWhaleMutationHookResult = ReturnType<typeof useDeleteWhaleMutation>;
export type DeleteWhaleMutationResult = Apollo.MutationResult<DeleteWhaleMutation>;
export type DeleteWhaleMutationOptions = Apollo.BaseMutationOptions<DeleteWhaleMutation, DeleteWhaleMutationVariables>;
export const PullWhaleDocument = gql`
    mutation PullWhale($id: ID!) {
  pullWhale(id: $id) {
    id
  }
}
    `;
export type PullWhaleMutationFn = Apollo.MutationFunction<PullWhaleMutation, PullWhaleMutationVariables>;

/**
 * __usePullWhaleMutation__
 *
 * To run a mutation, you first call `usePullWhaleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePullWhaleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pullWhaleMutation, { data, loading, error }] = usePullWhaleMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePullWhaleMutation(baseOptions?: Apollo.MutationHookOptions<PullWhaleMutation, PullWhaleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PullWhaleMutation, PullWhaleMutationVariables>(PullWhaleDocument, options);
      }
export type PullWhaleMutationHookResult = ReturnType<typeof usePullWhaleMutation>;
export type PullWhaleMutationResult = Apollo.MutationResult<PullWhaleMutation>;
export type PullWhaleMutationOptions = Apollo.BaseMutationOptions<PullWhaleMutation, PullWhaleMutationVariables>;
export const CreateWhaleDocument = gql`
    mutation CreateWhale($deployment: ID!, $clientId: String!, $token: String!, $faktEndpoint: String) {
  createWhale(deployment: $deployment, clientId: $clientId, token: $token) {
    ...DetailWhale
  }
}
    ${DetailWhaleFragmentDoc}`;
export type CreateWhaleMutationFn = Apollo.MutationFunction<CreateWhaleMutation, CreateWhaleMutationVariables>;

/**
 * __useCreateWhaleMutation__
 *
 * To run a mutation, you first call `useCreateWhaleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateWhaleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createWhaleMutation, { data, loading, error }] = useCreateWhaleMutation({
 *   variables: {
 *      deployment: // value for 'deployment'
 *      clientId: // value for 'clientId'
 *      token: // value for 'token'
 *      faktEndpoint: // value for 'faktEndpoint'
 *   },
 * });
 */
export function useCreateWhaleMutation(baseOptions?: Apollo.MutationHookOptions<CreateWhaleMutation, CreateWhaleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateWhaleMutation, CreateWhaleMutationVariables>(CreateWhaleDocument, options);
      }
export type CreateWhaleMutationHookResult = ReturnType<typeof useCreateWhaleMutation>;
export type CreateWhaleMutationResult = Apollo.MutationResult<CreateWhaleMutation>;
export type CreateWhaleMutationOptions = Apollo.BaseMutationOptions<CreateWhaleMutation, CreateWhaleMutationVariables>;
export const ContainersDocument = gql`
    query Containers($status: [ContainerStatus]) {
  containers(status: $status) {
    ...ListContainer
  }
}
    ${ListContainerFragmentDoc}`;

/**
 * __useContainersQuery__
 *
 * To run a query within a React component, call `useContainersQuery` and pass it any options that fit your needs.
 * When your component renders, `useContainersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useContainersQuery({
 *   variables: {
 *      status: // value for 'status'
 *   },
 * });
 */
export function useContainersQuery(baseOptions?: Apollo.QueryHookOptions<ContainersQuery, ContainersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ContainersQuery, ContainersQueryVariables>(ContainersDocument, options);
      }
export function useContainersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ContainersQuery, ContainersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ContainersQuery, ContainersQueryVariables>(ContainersDocument, options);
        }
export type ContainersQueryHookResult = ReturnType<typeof useContainersQuery>;
export type ContainersLazyQueryHookResult = ReturnType<typeof useContainersLazyQuery>;
export type ContainersQueryResult = Apollo.QueryResult<ContainersQuery, ContainersQueryVariables>;
export const DetailContainerDocument = gql`
    query DetailContainer($id: ID!) {
  container(id: $id) {
    ...DetailContainer
  }
}
    ${DetailContainerFragmentDoc}`;

/**
 * __useDetailContainerQuery__
 *
 * To run a query within a React component, call `useDetailContainerQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailContainerQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailContainerQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailContainerQuery(baseOptions: Apollo.QueryHookOptions<DetailContainerQuery, DetailContainerQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailContainerQuery, DetailContainerQueryVariables>(DetailContainerDocument, options);
      }
export function useDetailContainerLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailContainerQuery, DetailContainerQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailContainerQuery, DetailContainerQueryVariables>(DetailContainerDocument, options);
        }
export type DetailContainerQueryHookResult = ReturnType<typeof useDetailContainerQuery>;
export type DetailContainerLazyQueryHookResult = ReturnType<typeof useDetailContainerLazyQuery>;
export type DetailContainerQueryResult = Apollo.QueryResult<DetailContainerQuery, DetailContainerQueryVariables>;
export const DeploymentsDocument = gql`
    query Deployments {
  deployments {
    ...ListDeployment
  }
}
    ${ListDeploymentFragmentDoc}`;

/**
 * __useDeploymentsQuery__
 *
 * To run a query within a React component, call `useDeploymentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeploymentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeploymentsQuery({
 *   variables: {
 *   },
 * });
 */
export function useDeploymentsQuery(baseOptions?: Apollo.QueryHookOptions<DeploymentsQuery, DeploymentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeploymentsQuery, DeploymentsQueryVariables>(DeploymentsDocument, options);
      }
export function useDeploymentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeploymentsQuery, DeploymentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeploymentsQuery, DeploymentsQueryVariables>(DeploymentsDocument, options);
        }
export type DeploymentsQueryHookResult = ReturnType<typeof useDeploymentsQuery>;
export type DeploymentsLazyQueryHookResult = ReturnType<typeof useDeploymentsLazyQuery>;
export type DeploymentsQueryResult = Apollo.QueryResult<DeploymentsQuery, DeploymentsQueryVariables>;
export const DetailDeploymentDocument = gql`
    query DetailDeployment($id: ID!) {
  deployment(id: $id) {
    ...DetailDeployment
  }
}
    ${DetailDeploymentFragmentDoc}`;

/**
 * __useDetailDeploymentQuery__
 *
 * To run a query within a React component, call `useDetailDeploymentQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailDeploymentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailDeploymentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailDeploymentQuery(baseOptions: Apollo.QueryHookOptions<DetailDeploymentQuery, DetailDeploymentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailDeploymentQuery, DetailDeploymentQueryVariables>(DetailDeploymentDocument, options);
      }
export function useDetailDeploymentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailDeploymentQuery, DetailDeploymentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailDeploymentQuery, DetailDeploymentQueryVariables>(DetailDeploymentDocument, options);
        }
export type DetailDeploymentQueryHookResult = ReturnType<typeof useDetailDeploymentQuery>;
export type DetailDeploymentLazyQueryHookResult = ReturnType<typeof useDetailDeploymentLazyQuery>;
export type DetailDeploymentQueryResult = Apollo.QueryResult<DetailDeploymentQuery, DetailDeploymentQueryVariables>;
export const GithubReposDocument = gql`
    query GithubRepos {
  githubRepos {
    ...ListGithubRepo
  }
}
    ${ListGithubRepoFragmentDoc}`;

/**
 * __useGithubReposQuery__
 *
 * To run a query within a React component, call `useGithubReposQuery` and pass it any options that fit your needs.
 * When your component renders, `useGithubReposQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGithubReposQuery({
 *   variables: {
 *   },
 * });
 */
export function useGithubReposQuery(baseOptions?: Apollo.QueryHookOptions<GithubReposQuery, GithubReposQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GithubReposQuery, GithubReposQueryVariables>(GithubReposDocument, options);
      }
export function useGithubReposLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GithubReposQuery, GithubReposQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GithubReposQuery, GithubReposQueryVariables>(GithubReposDocument, options);
        }
export type GithubReposQueryHookResult = ReturnType<typeof useGithubReposQuery>;
export type GithubReposLazyQueryHookResult = ReturnType<typeof useGithubReposLazyQuery>;
export type GithubReposQueryResult = Apollo.QueryResult<GithubReposQuery, GithubReposQueryVariables>;
export const DetailGithubRepoDocument = gql`
    query DetailGithubRepo($id: ID!) {
  githubRepo(id: $id) {
    ...DetailGithubRepo
  }
}
    ${DetailGithubRepoFragmentDoc}`;

/**
 * __useDetailGithubRepoQuery__
 *
 * To run a query within a React component, call `useDetailGithubRepoQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailGithubRepoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailGithubRepoQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailGithubRepoQuery(baseOptions: Apollo.QueryHookOptions<DetailGithubRepoQuery, DetailGithubRepoQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailGithubRepoQuery, DetailGithubRepoQueryVariables>(DetailGithubRepoDocument, options);
      }
export function useDetailGithubRepoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailGithubRepoQuery, DetailGithubRepoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailGithubRepoQuery, DetailGithubRepoQueryVariables>(DetailGithubRepoDocument, options);
        }
export type DetailGithubRepoQueryHookResult = ReturnType<typeof useDetailGithubRepoQuery>;
export type DetailGithubRepoLazyQueryHookResult = ReturnType<typeof useDetailGithubRepoLazyQuery>;
export type DetailGithubRepoQueryResult = Apollo.QueryResult<DetailGithubRepoQuery, DetailGithubRepoQueryVariables>;
export const PortGlobalSearchDocument = gql`
    query PortGlobalSearch($search: String) {
  containers(search: $search) {
    ...ListContainer
  }
  whales(search: $search) {
    ...ListWhale
  }
}
    ${ListContainerFragmentDoc}
${ListWhaleFragmentDoc}`;

/**
 * __usePortGlobalSearchQuery__
 *
 * To run a query within a React component, call `usePortGlobalSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `usePortGlobalSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePortGlobalSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function usePortGlobalSearchQuery(baseOptions?: Apollo.QueryHookOptions<PortGlobalSearchQuery, PortGlobalSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PortGlobalSearchQuery, PortGlobalSearchQueryVariables>(PortGlobalSearchDocument, options);
      }
export function usePortGlobalSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PortGlobalSearchQuery, PortGlobalSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PortGlobalSearchQuery, PortGlobalSearchQueryVariables>(PortGlobalSearchDocument, options);
        }
export type PortGlobalSearchQueryHookResult = ReturnType<typeof usePortGlobalSearchQuery>;
export type PortGlobalSearchLazyQueryHookResult = ReturnType<typeof usePortGlobalSearchLazyQuery>;
export type PortGlobalSearchQueryResult = Apollo.QueryResult<PortGlobalSearchQuery, PortGlobalSearchQueryVariables>;
export const DetailWhaleDocument = gql`
    query DetailWhale($id: ID!) {
  whale(id: $id) {
    ...DetailWhale
  }
}
    ${DetailWhaleFragmentDoc}`;

/**
 * __useDetailWhaleQuery__
 *
 * To run a query within a React component, call `useDetailWhaleQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailWhaleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailWhaleQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailWhaleQuery(baseOptions: Apollo.QueryHookOptions<DetailWhaleQuery, DetailWhaleQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailWhaleQuery, DetailWhaleQueryVariables>(DetailWhaleDocument, options);
      }
export function useDetailWhaleLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailWhaleQuery, DetailWhaleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailWhaleQuery, DetailWhaleQueryVariables>(DetailWhaleDocument, options);
        }
export type DetailWhaleQueryHookResult = ReturnType<typeof useDetailWhaleQuery>;
export type DetailWhaleLazyQueryHookResult = ReturnType<typeof useDetailWhaleLazyQuery>;
export type DetailWhaleQueryResult = Apollo.QueryResult<DetailWhaleQuery, DetailWhaleQueryVariables>;
export const WhalesDocument = gql`
    query Whales {
  whales {
    ...ListWhale
  }
}
    ${ListWhaleFragmentDoc}`;

/**
 * __useWhalesQuery__
 *
 * To run a query within a React component, call `useWhalesQuery` and pass it any options that fit your needs.
 * When your component renders, `useWhalesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWhalesQuery({
 *   variables: {
 *   },
 * });
 */
export function useWhalesQuery(baseOptions?: Apollo.QueryHookOptions<WhalesQuery, WhalesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<WhalesQuery, WhalesQueryVariables>(WhalesDocument, options);
      }
export function useWhalesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<WhalesQuery, WhalesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<WhalesQuery, WhalesQueryVariables>(WhalesDocument, options);
        }
export type WhalesQueryHookResult = ReturnType<typeof useWhalesQuery>;
export type WhalesLazyQueryHookResult = ReturnType<typeof useWhalesLazyQuery>;
export type WhalesQueryResult = Apollo.QueryResult<WhalesQuery, WhalesQueryVariables>;