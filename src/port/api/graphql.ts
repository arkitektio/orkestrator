import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions =  {}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /**
   * The `DateTime` scalar type represents a DateTime
   * value as specified by
   * [iso8601](https://en.wikipedia.org/wiki/ISO_8601).
   */
  DateTime: any;
  /**
   * The `GenericScalar` scalar type represents a generic
   * GraphQL scalar value that could be:
   * String, Boolean, Int, Float, List or Object.
   */
  GenericScalar: any;
};


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


export type GithubRepo = {
  __typename?: 'GithubRepo';
  id: Scalars['ID'];
  repo: Scalars['String'];
  user: Scalars['String'];
  branch: Scalars['String'];
  definition?: Maybe<Scalars['GenericScalar']>;
  /** Does this Task want to be a BackendApp? */
  backend: Scalars['Boolean'];
  scopes?: Maybe<Scalars['GenericScalar']>;
  image: Scalars['String'];
  whale?: Maybe<Whale>;
  createdAt: Scalars['DateTime'];
};

/** The root Mutation */
export type Mutation = {
  __typename?: 'Mutation';
  createGithubRepo?: Maybe<GithubRepo>;
  /** Create Port Template (and corresponding ArkitektID) */
  createWhale?: Maybe<Whale>;
  deleteWhale?: Maybe<DeleteWhaleReturn>;
  deleteGithubRepo?: Maybe<DeleteGithubRepoReturn>;
};


/** The root Mutation */
export type MutationCreateGithubRepoArgs = {
  branch: Scalars['String'];
  repo: Scalars['String'];
  user: Scalars['String'];
};


/** The root Mutation */
export type MutationCreateWhaleArgs = {
  config?: Maybe<Scalars['GenericScalar']>;
  repo?: Maybe<Scalars['ID']>;
};


/** The root Mutation */
export type MutationDeleteWhaleArgs = {
  id?: Maybe<Scalars['ID']>;
};


/** The root Mutation */
export type MutationDeleteGithubRepoArgs = {
  id?: Maybe<Scalars['ID']>;
};

/** The root Query */
export type Query = {
  __typename?: 'Query';
  hello?: Maybe<Scalars['String']>;
  void?: Maybe<Scalars['String']>;
  /** Get information on your Docker Template */
  whale?: Maybe<Whale>;
  /** Get information on your Docker Template */
  githubRepo?: Maybe<GithubRepo>;
  whales?: Maybe<Array<Maybe<Whale>>>;
  githubRepos?: Maybe<Array<Maybe<GithubRepo>>>;
};


/** The root Query */
export type QueryWhaleArgs = {
  id?: Maybe<Scalars['ID']>;
  template?: Maybe<Scalars['ID']>;
};


/** The root Query */
export type QueryGithubRepoArgs = {
  id: Scalars['ID'];
};

export type Whale = {
  __typename?: 'Whale';
  id: Scalars['ID'];
  /** The corresponding Template on the Arkitekt Instance */
  template: Scalars['String'];
  image: Scalars['String'];
  config?: Maybe<Scalars['GenericScalar']>;
  createdAt: Scalars['DateTime'];
  githubrepo?: Maybe<GithubRepo>;
};

export type DetailGithubRepoFragment = (
  { __typename?: 'GithubRepo' }
  & Pick<GithubRepo, 'id' | 'user' | 'repo' | 'branch'>
  & { whale?: Maybe<(
    { __typename?: 'Whale' }
    & Pick<Whale, 'id' | 'template'>
  )> }
);

export type ListGithubRepoFragment = (
  { __typename?: 'GithubRepo' }
  & Pick<GithubRepo, 'id' | 'user' | 'repo' | 'branch'>
  & { whale?: Maybe<(
    { __typename?: 'Whale' }
    & Pick<Whale, 'id' | 'template'>
  )> }
);

export type DetailWhaleFragment = (
  { __typename?: 'Whale' }
  & Pick<Whale, 'id' | 'image' | 'config' | 'template'>
  & { githubrepo?: Maybe<(
    { __typename?: 'GithubRepo' }
    & Pick<GithubRepo, 'id'>
  )> }
);

export type ListWhaleFragment = (
  { __typename?: 'Whale' }
  & Pick<Whale, 'id' | 'image' | 'template'>
  & { githubrepo?: Maybe<(
    { __typename?: 'GithubRepo' }
    & Pick<GithubRepo, 'id'>
  )> }
);

export type CreateWhaleMutationVariables = Exact<{
  repo: Scalars['ID'];
  config?: Maybe<Scalars['GenericScalar']>;
}>;


export type CreateWhaleMutation = (
  { __typename?: 'Mutation' }
  & { createWhale?: Maybe<(
    { __typename?: 'Whale' }
    & ListWhaleFragment
  )> }
);

export type CreateGithubRepoMutationVariables = Exact<{
  repo: Scalars['String'];
  user: Scalars['String'];
  branch: Scalars['String'];
}>;


export type CreateGithubRepoMutation = (
  { __typename?: 'Mutation' }
  & { createGithubRepo?: Maybe<(
    { __typename?: 'GithubRepo' }
    & ListGithubRepoFragment
  )> }
);

export type DeleteWhaleMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteWhaleMutation = (
  { __typename?: 'Mutation' }
  & { deleteWhale?: Maybe<(
    { __typename?: 'DeleteWhaleReturn' }
    & Pick<DeleteWhaleReturn, 'id'>
  )> }
);

export type DeleteGithubRepoMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteGithubRepoMutation = (
  { __typename?: 'Mutation' }
  & { deleteGithubRepo?: Maybe<(
    { __typename?: 'DeleteGithubRepoReturn' }
    & Pick<DeleteGithubRepoReturn, 'id'>
  )> }
);

export type DetailWhaleQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailWhaleQuery = (
  { __typename?: 'Query' }
  & { whale?: Maybe<(
    { __typename?: 'Whale' }
    & DetailWhaleFragment
  )> }
);

export type WhalesQueryVariables = Exact<{ [key: string]: never; }>;


export type WhalesQuery = (
  { __typename?: 'Query' }
  & { whales?: Maybe<Array<Maybe<(
    { __typename?: 'Whale' }
    & ListWhaleFragment
  )>>> }
);

export type GithubReposQueryVariables = Exact<{ [key: string]: never; }>;


export type GithubReposQuery = (
  { __typename?: 'Query' }
  & { githubRepos?: Maybe<Array<Maybe<(
    { __typename?: 'GithubRepo' }
    & ListGithubRepoFragment
  )>>> }
);

export type DetailGithubRepoQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailGithubRepoQuery = (
  { __typename?: 'Query' }
  & { githubRepo?: Maybe<(
    { __typename?: 'GithubRepo' }
    & DetailGithubRepoFragment
  )> }
);

export const DetailGithubRepoFragmentDoc = gql`
    fragment DetailGithubRepo on GithubRepo {
  id
  user
  repo
  branch
  whale {
    id
    template
  }
}
    `;
export const ListGithubRepoFragmentDoc = gql`
    fragment ListGithubRepo on GithubRepo {
  id
  user
  repo
  branch
  whale {
    id
    template
  }
}
    `;
export const DetailWhaleFragmentDoc = gql`
    fragment DetailWhale on Whale {
  id
  githubrepo {
    id
  }
  image
  config
  template
}
    `;
export const ListWhaleFragmentDoc = gql`
    fragment ListWhale on Whale {
  id
  githubrepo {
    id
  }
  image
  template
}
    `;
export const CreateWhaleDocument = gql`
    mutation CreateWhale($repo: ID!, $config: GenericScalar) {
  createWhale(repo: $repo, config: $config) {
    ...ListWhale
  }
}
    ${ListWhaleFragmentDoc}`;
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
 *      repo: // value for 'repo'
 *      config: // value for 'config'
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