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
  ArrayLike: any;
  DateTime: any;
};

export type ClusterFilter = {
  ids?: InputMaybe<Array<Scalars['ID']>>;
  search?: InputMaybe<Scalars['String']>;
};

export type CreateClusterInput = {
  name: Scalars['String'];
};

/**  A dask cluster */
export type DaskCluster = {
  __typename?: 'DaskCluster';
  dashboardLink: Scalars['String'];
  id: Scalars['ID'];
  name: Scalars['String'];
  options: Scalars['ArrayLike'];
  schedulerAddress: Scalars['String'];
  security?: Maybe<Security>;
  startTime?: Maybe<Scalars['DateTime']>;
  status: DaskClusterState;
  stopTime?: Maybe<Scalars['DateTime']>;
  tags: Array<Scalars['String']>;
};

export enum DaskClusterState {
  Failed = 'FAILED',
  Pending = 'PENDING',
  Running = 'RUNNING',
  Stopped = 'STOPPED',
  Stopping = 'STOPPING'
}

export type Mutation = {
  __typename?: 'Mutation';
  createDaskCluster: DaskCluster;
  stopDaskCluster: Scalars['ID'];
};


export type MutationCreateDaskClusterArgs = {
  input: CreateClusterInput;
};


export type MutationStopDaskClusterArgs = {
  id: Scalars['ID'];
};

export type OffsetPaginationInput = {
  limit?: Scalars['Int'];
  offset?: Scalars['Int'];
};

export type Query = {
  __typename?: 'Query';
  daskCluster: DaskCluster;
  daskClusters: Array<DaskCluster>;
  me: User;
};


export type QueryDaskClusterArgs = {
  id: Scalars['ID'];
};


export type QueryDaskClustersArgs = {
  filters?: InputMaybe<ClusterFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/**  A security object for a dask cluster */
export type Security = {
  __typename?: 'Security';
  tlsCert: Scalars['String'];
  tlsKey: Scalars['String'];
};

export type User = {
  __typename?: 'User';
  email: Scalars['String'];
  id: Scalars['ID'];
  password: Scalars['String'];
  sub: Scalars['String'];
  username: Scalars['String'];
};

export type DaskClusterFragment = { __typename?: 'DaskCluster', id: string, name: string, dashboardLink: string };

export type ListDaskClusterFragment = { __typename?: 'DaskCluster', id: string, name: string, dashboardLink: string, startTime?: any | null };

export type StopDaskClusterMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type StopDaskClusterMutation = { __typename?: 'Mutation', stopDaskCluster: string };

export type CreateNewClusterMutationVariables = Exact<{
  name: Scalars['String'];
}>;


export type CreateNewClusterMutation = { __typename?: 'Mutation', createDaskCluster: { __typename?: 'DaskCluster', id: string, name: string, dashboardLink: string } };

export type ListClusterQueryVariables = Exact<{ [key: string]: never; }>;


export type ListClusterQuery = { __typename?: 'Query', daskClusters: Array<{ __typename?: 'DaskCluster', id: string, name: string, dashboardLink: string, startTime?: any | null }> };

export const DaskClusterFragmentDoc = gql`
    fragment DaskCluster on DaskCluster {
  id
  name
  dashboardLink
}
    `;
export const ListDaskClusterFragmentDoc = gql`
    fragment ListDaskCluster on DaskCluster {
  id
  name
  dashboardLink
  startTime
}
    `;
export const StopDaskClusterDocument = gql`
    mutation StopDaskCluster($id: ID!) {
  stopDaskCluster(id: $id)
}
    `;
export type StopDaskClusterMutationFn = Apollo.MutationFunction<StopDaskClusterMutation, StopDaskClusterMutationVariables>;

/**
 * __useStopDaskClusterMutation__
 *
 * To run a mutation, you first call `useStopDaskClusterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStopDaskClusterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [stopDaskClusterMutation, { data, loading, error }] = useStopDaskClusterMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useStopDaskClusterMutation(baseOptions?: Apollo.MutationHookOptions<StopDaskClusterMutation, StopDaskClusterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<StopDaskClusterMutation, StopDaskClusterMutationVariables>(StopDaskClusterDocument, options);
      }
export type StopDaskClusterMutationHookResult = ReturnType<typeof useStopDaskClusterMutation>;
export type StopDaskClusterMutationResult = Apollo.MutationResult<StopDaskClusterMutation>;
export type StopDaskClusterMutationOptions = Apollo.BaseMutationOptions<StopDaskClusterMutation, StopDaskClusterMutationVariables>;
export const CreateNewClusterDocument = gql`
    mutation CreateNewCluster($name: String!) {
  createDaskCluster(input: {name: $name}) {
    ...DaskCluster
  }
}
    ${DaskClusterFragmentDoc}`;
export type CreateNewClusterMutationFn = Apollo.MutationFunction<CreateNewClusterMutation, CreateNewClusterMutationVariables>;

/**
 * __useCreateNewClusterMutation__
 *
 * To run a mutation, you first call `useCreateNewClusterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateNewClusterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createNewClusterMutation, { data, loading, error }] = useCreateNewClusterMutation({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreateNewClusterMutation(baseOptions?: Apollo.MutationHookOptions<CreateNewClusterMutation, CreateNewClusterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateNewClusterMutation, CreateNewClusterMutationVariables>(CreateNewClusterDocument, options);
      }
export type CreateNewClusterMutationHookResult = ReturnType<typeof useCreateNewClusterMutation>;
export type CreateNewClusterMutationResult = Apollo.MutationResult<CreateNewClusterMutation>;
export type CreateNewClusterMutationOptions = Apollo.BaseMutationOptions<CreateNewClusterMutation, CreateNewClusterMutationVariables>;
export const ListClusterDocument = gql`
    query ListCluster {
  daskClusters {
    ...ListDaskCluster
  }
}
    ${ListDaskClusterFragmentDoc}`;

/**
 * __useListClusterQuery__
 *
 * To run a query within a React component, call `useListClusterQuery` and pass it any options that fit your needs.
 * When your component renders, `useListClusterQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListClusterQuery({
 *   variables: {
 *   },
 * });
 */
export function useListClusterQuery(baseOptions?: Apollo.QueryHookOptions<ListClusterQuery, ListClusterQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListClusterQuery, ListClusterQueryVariables>(ListClusterDocument, options);
      }
export function useListClusterLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListClusterQuery, ListClusterQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListClusterQuery, ListClusterQueryVariables>(ListClusterDocument, options);
        }
export type ListClusterQueryHookResult = ReturnType<typeof useListClusterQuery>;
export type ListClusterLazyQueryHookResult = ReturnType<typeof useListClusterLazyQuery>;
export type ListClusterQueryResult = Apollo.QueryResult<ListClusterQuery, ListClusterQueryVariables>;