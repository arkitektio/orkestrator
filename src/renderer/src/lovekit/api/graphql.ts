import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lovekit/api/funcs';
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
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

export type App = {
  __typename?: 'App';
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
};

export type Client = {
  __typename?: 'Client';
  clientId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  release?: Maybe<Release>;
};

export type CollaborativeBroadcast = {
  __typename?: 'CollaborativeBroadcast';
  audioStreams: Array<Stream>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** The streamers that are collaborating on this broadcast. */
  streamers: Array<Streamer>;
  streams: Array<Stream>;
  title: Scalars['String']['output'];
  videoStreams: Array<Stream>;
};


export type CollaborativeBroadcastStreamersArgs = {
  filters?: InputMaybe<StreamerFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Filter for Solo Broadcasts */
export type CollaborativeBroadcastFilter = {
  AND?: InputMaybe<CollaborativeBroadcastFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CollaborativeBroadcastFilter>;
  OR?: InputMaybe<CollaborativeBroadcastFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type EnsureCollaborativeBroadcastInput = {
  instanceId?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type EnsureSoloBroadcastInput = {
  instanceId?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type EnsureStreamInput = {
  broadcast?: InputMaybe<Scalars['ID']['input']>;
  kind?: StreamKind;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type JoinBroadcastInput = {
  broadcast: Scalars['ID']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Create a collaborative broadcast */
  ensureCollaborativeBroadcast: CollaborativeBroadcast;
  /** Create a solo broadcast */
  ensureSoloBroadcast: SoloBroadcast;
  /** Create a stream and return the token for it */
  ensureStream: Scalars['String']['output'];
  /** Join a solo broadcast and return the token for it */
  joinBroadcast: Scalars['String']['output'];
};


export type MutationEnsureCollaborativeBroadcastArgs = {
  input: EnsureCollaborativeBroadcastInput;
};


export type MutationEnsureSoloBroadcastArgs = {
  input: EnsureSoloBroadcastInput;
};


export type MutationEnsureStreamArgs = {
  input: EnsureStreamInput;
};


export type MutationJoinBroadcastArgs = {
  input: JoinBroadcastInput;
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Get a collaborative broadcast by ID */
  collaborativeBroadcast: CollaborativeBroadcast;
  /** Get all collaborative broadcasts */
  collaborativeBroadcasts: Array<CollaborativeBroadcast>;
  /** Get a solo broadcast by ID */
  soloBroadcast: SoloBroadcast;
  /** Get all solo broadcasts */
  soloBroadcasts: Array<SoloBroadcast>;
  /** Get a stream by ID */
  stream: Stream;
  /** Get a stream */
  streams: Array<Stream>;
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryCollaborativeBroadcastArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCollaborativeBroadcastsArgs = {
  filters?: InputMaybe<CollaborativeBroadcastFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuerySoloBroadcastArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySoloBroadcastsArgs = {
  filters?: InputMaybe<SoloBroadcastFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryStreamArgs = {
  id: Scalars['ID']['input'];
};


export type QueryStreamsArgs = {
  filters?: InputMaybe<StreamFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type Release = {
  __typename?: 'Release';
  app: App;
  id: Scalars['ID']['output'];
  version: Scalars['String']['output'];
};

export type SoloBroadcast = {
  __typename?: 'SoloBroadcast';
  audioStreams: Array<Stream>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  streamer: Streamer;
  title: Scalars['String']['output'];
  videoStreams: Array<Stream>;
};

/** Filter for Solo Broadcasts */
export type SoloBroadcastFilter = {
  AND?: InputMaybe<SoloBroadcastFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<SoloBroadcastFilter>;
  OR?: InputMaybe<SoloBroadcastFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Stream = {
  __typename?: 'Stream';
  id: Scalars['ID']['output'];
  kind: StreamKind;
  streamer: Streamer;
  title: Scalars['String']['output'];
};

export type StreamEvent = {
  __typename?: 'StreamEvent';
  create?: Maybe<Stream>;
  delete?: Maybe<Scalars['ID']['output']>;
  moved?: Maybe<Stream>;
  update?: Maybe<Stream>;
};

/** Filter for Streams */
export type StreamFilter = {
  AND?: InputMaybe<StreamFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<StreamFilter>;
  OR?: InputMaybe<StreamFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** The state of a dask cluster */
export enum StreamKind {
  Audio = 'AUDIO',
  Video = 'VIDEO'
}

export type Streamer = {
  __typename?: 'Streamer';
  client: Client;
  /** The collaborative broadcasts created by this agent. */
  collaborativeBroadcasts: Array<CollaborativeBroadcast>;
  id: Scalars['ID']['output'];
  /** The solo broadcasts created by this agent, if any. */
  soloBroadcasts?: Maybe<SoloBroadcast>;
  user: User;
};


export type StreamerCollaborativeBroadcastsArgs = {
  filters?: InputMaybe<CollaborativeBroadcastFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Filter for Dask Clusters */
export type StreamerFilter = {
  AND?: InputMaybe<StreamerFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<StreamerFilter>;
  OR?: InputMaybe<StreamerFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Subscribe to stream events */
  streams: StreamEvent;
};


export type SubscriptionStreamsArgs = {
  dataset?: InputMaybe<Scalars['ID']['input']>;
};

export type User = {
  __typename?: 'User';
  activeOrganization?: Maybe<Organization>;
  id: Scalars['ID']['output'];
  preferredUsername: Scalars['String']['output'];
  sub: Scalars['String']['output'];
};

export type _Entity = App | Client | Organization | Release | User;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type SoloBroadcastFragment = { __typename?: 'SoloBroadcast', id: string, title: string, streamer: (
    { __typename?: 'Streamer' }
    & StreamerFragment
  ) };

export type ListSoloBroadcastFragment = { __typename?: 'SoloBroadcast', id: string, title: string, streamer: (
    { __typename?: 'Streamer' }
    & StreamerFragment
  ) };

export type CollaborativeBroadcastFragment = { __typename?: 'CollaborativeBroadcast', id: string, title: string, streamers: Array<(
    { __typename?: 'Streamer' }
    & StreamerFragment
  )> };

export type StreamFragment = { __typename?: 'Stream', id: string };

export type ListStreamFragment = { __typename?: 'Stream', id: string };

export type StreamerFragment = { __typename?: 'Streamer', user: { __typename?: 'User', sub: string }, client: { __typename?: 'Client', clientId: string } };

export type EnsureSoloBroadcastMutationVariables = Exact<{
  input: EnsureSoloBroadcastInput;
}>;


export type EnsureSoloBroadcastMutation = { __typename?: 'Mutation', ensureSoloBroadcast: (
    { __typename?: 'SoloBroadcast' }
    & SoloBroadcastFragment
  ) };

export type JoinBroadcastMutationVariables = Exact<{
  input: JoinBroadcastInput;
}>;


export type JoinBroadcastMutation = { __typename?: 'Mutation', joinBroadcast: string };

export type EnsureStreamMutationVariables = Exact<{
  input: EnsureStreamInput;
}>;


export type EnsureStreamMutation = { __typename?: 'Mutation', ensureStream: string };

export type GetCollaborativeBroadcastQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetCollaborativeBroadcastQuery = { __typename?: 'Query', collaborativeBroadcast: (
    { __typename?: 'CollaborativeBroadcast' }
    & CollaborativeBroadcastFragment
  ) };

export type SearchollaborativeBroadcastsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchollaborativeBroadcastsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'CollaborativeBroadcast', value: string, label: string }> };

export type ListCollaborativeBroadcastsQueryVariables = Exact<{
  filter?: InputMaybe<CollaborativeBroadcastFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListCollaborativeBroadcastsQuery = { __typename?: 'Query', collaborativeBroadcasts: Array<(
    { __typename?: 'CollaborativeBroadcast' }
    & CollaborativeBroadcastFragment
  )> };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', streams: Array<(
    { __typename?: 'Stream' }
    & ListStreamFragment
  )> };

export type GetSoloBroadcastQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetSoloBroadcastQuery = { __typename?: 'Query', soloBroadcast: (
    { __typename?: 'SoloBroadcast' }
    & SoloBroadcastFragment
  ) };

export type SearchSoloBroadcastQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchSoloBroadcastQuery = { __typename?: 'Query', options: Array<{ __typename?: 'SoloBroadcast', value: string, label: string }> };

export type ListSoloBroadcastsQueryVariables = Exact<{
  filter?: InputMaybe<SoloBroadcastFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListSoloBroadcastsQuery = { __typename?: 'Query', soloBroadcasts: Array<(
    { __typename?: 'SoloBroadcast' }
    & SoloBroadcastFragment
  )> };

export type GetStreamQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetStreamQuery = { __typename?: 'Query', stream: (
    { __typename?: 'Stream' }
    & StreamFragment
  ) };

export type SearchStreamsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchStreamsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Stream', value: string, label: string }> };

export type ListStreamsQueryVariables = Exact<{
  filter?: InputMaybe<StreamFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListStreamsQuery = { __typename?: 'Query', streams: Array<(
    { __typename?: 'Stream' }
    & StreamFragment
  )> };

export const StreamerFragmentDoc = gql`
    fragment Streamer on Streamer {
  user {
    sub
  }
  client {
    clientId
  }
}
    `;
export const SoloBroadcastFragmentDoc = gql`
    fragment SoloBroadcast on SoloBroadcast {
  id
  title
  streamer {
    ...Streamer
  }
}
    ${StreamerFragmentDoc}`;
export const ListSoloBroadcastFragmentDoc = gql`
    fragment ListSoloBroadcast on SoloBroadcast {
  id
  title
  streamer {
    ...Streamer
  }
}
    ${StreamerFragmentDoc}`;
export const CollaborativeBroadcastFragmentDoc = gql`
    fragment CollaborativeBroadcast on CollaborativeBroadcast {
  id
  title
  streamers {
    ...Streamer
  }
}
    ${StreamerFragmentDoc}`;
export const StreamFragmentDoc = gql`
    fragment Stream on Stream {
  id
}
    `;
export const ListStreamFragmentDoc = gql`
    fragment ListStream on Stream {
  id
}
    `;
export const EnsureSoloBroadcastDocument = gql`
    mutation EnsureSoloBroadcast($input: EnsureSoloBroadcastInput!) {
  ensureSoloBroadcast(input: $input) {
    ...SoloBroadcast
  }
}
    ${SoloBroadcastFragmentDoc}`;
export type EnsureSoloBroadcastMutationFn = Apollo.MutationFunction<EnsureSoloBroadcastMutation, EnsureSoloBroadcastMutationVariables>;

/**
 * __useEnsureSoloBroadcastMutation__
 *
 * To run a mutation, you first call `useEnsureSoloBroadcastMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureSoloBroadcastMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureSoloBroadcastMutation, { data, loading, error }] = useEnsureSoloBroadcastMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useEnsureSoloBroadcastMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<EnsureSoloBroadcastMutation, EnsureSoloBroadcastMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<EnsureSoloBroadcastMutation, EnsureSoloBroadcastMutationVariables>(EnsureSoloBroadcastDocument, options);
      }
export type EnsureSoloBroadcastMutationHookResult = ReturnType<typeof useEnsureSoloBroadcastMutation>;
export type EnsureSoloBroadcastMutationResult = Apollo.MutationResult<EnsureSoloBroadcastMutation>;
export type EnsureSoloBroadcastMutationOptions = Apollo.BaseMutationOptions<EnsureSoloBroadcastMutation, EnsureSoloBroadcastMutationVariables>;
export const JoinBroadcastDocument = gql`
    mutation JoinBroadcast($input: JoinBroadcastInput!) {
  joinBroadcast(input: $input)
}
    `;
export type JoinBroadcastMutationFn = Apollo.MutationFunction<JoinBroadcastMutation, JoinBroadcastMutationVariables>;

/**
 * __useJoinBroadcastMutation__
 *
 * To run a mutation, you first call `useJoinBroadcastMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJoinBroadcastMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [joinBroadcastMutation, { data, loading, error }] = useJoinBroadcastMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useJoinBroadcastMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<JoinBroadcastMutation, JoinBroadcastMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<JoinBroadcastMutation, JoinBroadcastMutationVariables>(JoinBroadcastDocument, options);
      }
export type JoinBroadcastMutationHookResult = ReturnType<typeof useJoinBroadcastMutation>;
export type JoinBroadcastMutationResult = Apollo.MutationResult<JoinBroadcastMutation>;
export type JoinBroadcastMutationOptions = Apollo.BaseMutationOptions<JoinBroadcastMutation, JoinBroadcastMutationVariables>;
export const EnsureStreamDocument = gql`
    mutation EnsureStream($input: EnsureStreamInput!) {
  ensureStream(input: $input)
}
    `;
export type EnsureStreamMutationFn = Apollo.MutationFunction<EnsureStreamMutation, EnsureStreamMutationVariables>;

/**
 * __useEnsureStreamMutation__
 *
 * To run a mutation, you first call `useEnsureStreamMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureStreamMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureStreamMutation, { data, loading, error }] = useEnsureStreamMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useEnsureStreamMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<EnsureStreamMutation, EnsureStreamMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<EnsureStreamMutation, EnsureStreamMutationVariables>(EnsureStreamDocument, options);
      }
export type EnsureStreamMutationHookResult = ReturnType<typeof useEnsureStreamMutation>;
export type EnsureStreamMutationResult = Apollo.MutationResult<EnsureStreamMutation>;
export type EnsureStreamMutationOptions = Apollo.BaseMutationOptions<EnsureStreamMutation, EnsureStreamMutationVariables>;
export const GetCollaborativeBroadcastDocument = gql`
    query GetCollaborativeBroadcast($id: ID!) {
  collaborativeBroadcast(id: $id) {
    ...CollaborativeBroadcast
  }
}
    ${CollaborativeBroadcastFragmentDoc}`;

/**
 * __useGetCollaborativeBroadcastQuery__
 *
 * To run a query within a React component, call `useGetCollaborativeBroadcastQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCollaborativeBroadcastQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCollaborativeBroadcastQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetCollaborativeBroadcastQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetCollaborativeBroadcastQuery, GetCollaborativeBroadcastQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetCollaborativeBroadcastQuery, GetCollaborativeBroadcastQueryVariables>(GetCollaborativeBroadcastDocument, options);
      }
export function useGetCollaborativeBroadcastLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetCollaborativeBroadcastQuery, GetCollaborativeBroadcastQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetCollaborativeBroadcastQuery, GetCollaborativeBroadcastQueryVariables>(GetCollaborativeBroadcastDocument, options);
        }
export type GetCollaborativeBroadcastQueryHookResult = ReturnType<typeof useGetCollaborativeBroadcastQuery>;
export type GetCollaborativeBroadcastLazyQueryHookResult = ReturnType<typeof useGetCollaborativeBroadcastLazyQuery>;
export type GetCollaborativeBroadcastQueryResult = Apollo.QueryResult<GetCollaborativeBroadcastQuery, GetCollaborativeBroadcastQueryVariables>;
export const SearchollaborativeBroadcastsDocument = gql`
    query SearchollaborativeBroadcasts($search: String, $values: [ID!]) {
  options: collaborativeBroadcasts(
    filters: {search: $search, ids: $values}
    pagination: {limit: 10}
  ) {
    value: id
    label: title
  }
}
    `;

/**
 * __useSearchollaborativeBroadcastsQuery__
 *
 * To run a query within a React component, call `useSearchollaborativeBroadcastsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchollaborativeBroadcastsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchollaborativeBroadcastsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchollaborativeBroadcastsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchollaborativeBroadcastsQuery, SearchollaborativeBroadcastsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchollaborativeBroadcastsQuery, SearchollaborativeBroadcastsQueryVariables>(SearchollaborativeBroadcastsDocument, options);
      }
export function useSearchollaborativeBroadcastsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchollaborativeBroadcastsQuery, SearchollaborativeBroadcastsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchollaborativeBroadcastsQuery, SearchollaborativeBroadcastsQueryVariables>(SearchollaborativeBroadcastsDocument, options);
        }
export type SearchollaborativeBroadcastsQueryHookResult = ReturnType<typeof useSearchollaborativeBroadcastsQuery>;
export type SearchollaborativeBroadcastsLazyQueryHookResult = ReturnType<typeof useSearchollaborativeBroadcastsLazyQuery>;
export type SearchollaborativeBroadcastsQueryResult = Apollo.QueryResult<SearchollaborativeBroadcastsQuery, SearchollaborativeBroadcastsQueryVariables>;
export const ListCollaborativeBroadcastsDocument = gql`
    query ListCollaborativeBroadcasts($filter: CollaborativeBroadcastFilter, $pagination: OffsetPaginationInput) {
  collaborativeBroadcasts(filters: $filter, pagination: $pagination) {
    ...CollaborativeBroadcast
  }
}
    ${CollaborativeBroadcastFragmentDoc}`;

/**
 * __useListCollaborativeBroadcastsQuery__
 *
 * To run a query within a React component, call `useListCollaborativeBroadcastsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListCollaborativeBroadcastsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListCollaborativeBroadcastsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListCollaborativeBroadcastsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListCollaborativeBroadcastsQuery, ListCollaborativeBroadcastsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListCollaborativeBroadcastsQuery, ListCollaborativeBroadcastsQueryVariables>(ListCollaborativeBroadcastsDocument, options);
      }
export function useListCollaborativeBroadcastsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListCollaborativeBroadcastsQuery, ListCollaborativeBroadcastsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListCollaborativeBroadcastsQuery, ListCollaborativeBroadcastsQueryVariables>(ListCollaborativeBroadcastsDocument, options);
        }
export type ListCollaborativeBroadcastsQueryHookResult = ReturnType<typeof useListCollaborativeBroadcastsQuery>;
export type ListCollaborativeBroadcastsLazyQueryHookResult = ReturnType<typeof useListCollaborativeBroadcastsLazyQuery>;
export type ListCollaborativeBroadcastsQueryResult = Apollo.QueryResult<ListCollaborativeBroadcastsQuery, ListCollaborativeBroadcastsQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String) {
  streams(filters: {search: $search}) {
    ...ListStream
  }
}
    ${ListStreamFragmentDoc}`;

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
 *   },
 * });
 */
export function useGlobalSearchQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
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
export const GetSoloBroadcastDocument = gql`
    query GetSoloBroadcast($id: ID!) {
  soloBroadcast(id: $id) {
    ...SoloBroadcast
  }
}
    ${SoloBroadcastFragmentDoc}`;

/**
 * __useGetSoloBroadcastQuery__
 *
 * To run a query within a React component, call `useGetSoloBroadcastQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSoloBroadcastQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSoloBroadcastQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetSoloBroadcastQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetSoloBroadcastQuery, GetSoloBroadcastQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetSoloBroadcastQuery, GetSoloBroadcastQueryVariables>(GetSoloBroadcastDocument, options);
      }
export function useGetSoloBroadcastLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetSoloBroadcastQuery, GetSoloBroadcastQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetSoloBroadcastQuery, GetSoloBroadcastQueryVariables>(GetSoloBroadcastDocument, options);
        }
export type GetSoloBroadcastQueryHookResult = ReturnType<typeof useGetSoloBroadcastQuery>;
export type GetSoloBroadcastLazyQueryHookResult = ReturnType<typeof useGetSoloBroadcastLazyQuery>;
export type GetSoloBroadcastQueryResult = Apollo.QueryResult<GetSoloBroadcastQuery, GetSoloBroadcastQueryVariables>;
export const SearchSoloBroadcastDocument = gql`
    query SearchSoloBroadcast($search: String, $values: [ID!]) {
  options: soloBroadcasts(
    filters: {search: $search, ids: $values}
    pagination: {limit: 10}
  ) {
    value: id
    label: title
  }
}
    `;

/**
 * __useSearchSoloBroadcastQuery__
 *
 * To run a query within a React component, call `useSearchSoloBroadcastQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchSoloBroadcastQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchSoloBroadcastQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchSoloBroadcastQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchSoloBroadcastQuery, SearchSoloBroadcastQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchSoloBroadcastQuery, SearchSoloBroadcastQueryVariables>(SearchSoloBroadcastDocument, options);
      }
export function useSearchSoloBroadcastLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchSoloBroadcastQuery, SearchSoloBroadcastQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchSoloBroadcastQuery, SearchSoloBroadcastQueryVariables>(SearchSoloBroadcastDocument, options);
        }
export type SearchSoloBroadcastQueryHookResult = ReturnType<typeof useSearchSoloBroadcastQuery>;
export type SearchSoloBroadcastLazyQueryHookResult = ReturnType<typeof useSearchSoloBroadcastLazyQuery>;
export type SearchSoloBroadcastQueryResult = Apollo.QueryResult<SearchSoloBroadcastQuery, SearchSoloBroadcastQueryVariables>;
export const ListSoloBroadcastsDocument = gql`
    query ListSoloBroadcasts($filter: SoloBroadcastFilter, $pagination: OffsetPaginationInput) {
  soloBroadcasts(filters: $filter, pagination: $pagination) {
    ...SoloBroadcast
  }
}
    ${SoloBroadcastFragmentDoc}`;

/**
 * __useListSoloBroadcastsQuery__
 *
 * To run a query within a React component, call `useListSoloBroadcastsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListSoloBroadcastsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListSoloBroadcastsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListSoloBroadcastsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListSoloBroadcastsQuery, ListSoloBroadcastsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListSoloBroadcastsQuery, ListSoloBroadcastsQueryVariables>(ListSoloBroadcastsDocument, options);
      }
export function useListSoloBroadcastsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListSoloBroadcastsQuery, ListSoloBroadcastsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListSoloBroadcastsQuery, ListSoloBroadcastsQueryVariables>(ListSoloBroadcastsDocument, options);
        }
export type ListSoloBroadcastsQueryHookResult = ReturnType<typeof useListSoloBroadcastsQuery>;
export type ListSoloBroadcastsLazyQueryHookResult = ReturnType<typeof useListSoloBroadcastsLazyQuery>;
export type ListSoloBroadcastsQueryResult = Apollo.QueryResult<ListSoloBroadcastsQuery, ListSoloBroadcastsQueryVariables>;
export const GetStreamDocument = gql`
    query GetStream($id: ID!) {
  stream(id: $id) {
    ...Stream
  }
}
    ${StreamFragmentDoc}`;

/**
 * __useGetStreamQuery__
 *
 * To run a query within a React component, call `useGetStreamQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetStreamQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetStreamQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetStreamQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetStreamQuery, GetStreamQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetStreamQuery, GetStreamQueryVariables>(GetStreamDocument, options);
      }
export function useGetStreamLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetStreamQuery, GetStreamQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetStreamQuery, GetStreamQueryVariables>(GetStreamDocument, options);
        }
export type GetStreamQueryHookResult = ReturnType<typeof useGetStreamQuery>;
export type GetStreamLazyQueryHookResult = ReturnType<typeof useGetStreamLazyQuery>;
export type GetStreamQueryResult = Apollo.QueryResult<GetStreamQuery, GetStreamQueryVariables>;
export const SearchStreamsDocument = gql`
    query SearchStreams($search: String, $values: [ID!]) {
  options: streams(
    filters: {search: $search, ids: $values}
    pagination: {limit: 10}
  ) {
    value: id
    label: title
  }
}
    `;

/**
 * __useSearchStreamsQuery__
 *
 * To run a query within a React component, call `useSearchStreamsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchStreamsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchStreamsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchStreamsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchStreamsQuery, SearchStreamsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchStreamsQuery, SearchStreamsQueryVariables>(SearchStreamsDocument, options);
      }
export function useSearchStreamsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchStreamsQuery, SearchStreamsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchStreamsQuery, SearchStreamsQueryVariables>(SearchStreamsDocument, options);
        }
export type SearchStreamsQueryHookResult = ReturnType<typeof useSearchStreamsQuery>;
export type SearchStreamsLazyQueryHookResult = ReturnType<typeof useSearchStreamsLazyQuery>;
export type SearchStreamsQueryResult = Apollo.QueryResult<SearchStreamsQuery, SearchStreamsQueryVariables>;
export const ListStreamsDocument = gql`
    query ListStreams($filter: StreamFilter, $pagination: OffsetPaginationInput) {
  streams(filters: $filter, pagination: $pagination) {
    ...Stream
  }
}
    ${StreamFragmentDoc}`;

/**
 * __useListStreamsQuery__
 *
 * To run a query within a React component, call `useListStreamsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListStreamsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListStreamsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListStreamsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListStreamsQuery, ListStreamsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListStreamsQuery, ListStreamsQueryVariables>(ListStreamsDocument, options);
      }
export function useListStreamsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListStreamsQuery, ListStreamsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListStreamsQuery, ListStreamsQueryVariables>(ListStreamsDocument, options);
        }
export type ListStreamsQueryHookResult = ReturnType<typeof useListStreamsQuery>;
export type ListStreamsLazyQueryHookResult = ReturnType<typeof useListStreamsLazyQuery>;
export type ListStreamsQueryResult = Apollo.QueryResult<ListStreamsQuery, ListStreamsQueryVariables>;