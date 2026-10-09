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

export type Call = {
  __typename?: 'Call';
  /** The structures this call is about. */
  about: Array<Structure>;
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  /** How many are in the call right now. */
  participantCount: Scalars['Int']['output'];
  /** Who is in the call right now. Empty when nobody is: a call is live while LiveKit holds its room. */
  participants: Array<CallParticipant>;
  /** The LiveKit room this call's participants join. */
  roomName: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

/** Filter for calls */
export type CallFilter = {
  AND?: InputMaybe<CallFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CallFilter>;
  OR?: InputMaybe<CallFilter>;
  /** Calls about this structure. */
  about?: InputMaybe<StructureInput>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only calls whose LiveKit room is up (true) or down (false). */
  live?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Someone asking someone else into a call */
export type CallInvite = {
  __typename?: 'CallInvite';
  call: Call;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  invitee: User;
  inviter: User;
};

/** An invitation to a call arriving, or going away */
export type CallInviteEvent = {
  __typename?: 'CallInviteEvent';
  /** A new invitation for you */
  create?: Maybe<CallInvite>;
  /** An invitation that was dismissed or answered, here or on another device */
  delete?: Maybe<Scalars['ID']['output']>;
};

export type CallOrder =
  { createdAt: Ordering; };

/** Someone in a live call, as LiveKit reports them */
export type CallParticipant = {
  __typename?: 'CallParticipant';
  identity: Scalars['String']['output'];
  joinedAt: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type Client = {
  __typename?: 'Client';
  clientId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
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

/** The invitation to put away */
export type DismissCallInviteInput = {
  id: Scalars['ID']['input'];
};

/** The call to find or start */
export type EnsureCallInput = {
  about: Array<StructureInput>;
  title?: InputMaybe<Scalars['String']['input']>;
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

/** Who to ask into a call */
export type InviteToCallInput = {
  call: Scalars['ID']['input'];
  /** The users to invite, by their lok id (the `sub` their token carries) */
  users: Array<Scalars['ID']['input']>;
};

export type JoinBroadcastInput = {
  broadcast: Scalars['ID']['input'];
};

/** The call to join */
export type JoinCallInput = {
  call: Scalars['ID']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Put an invitation away, on every device */
  dismissCallInvite: Scalars['ID']['output'];
  /** The live call about these structures, or a new one */
  ensureCall: Call;
  /** Create a collaborative broadcast */
  ensureCollaborativeBroadcast: CollaborativeBroadcast;
  /** Create a solo broadcast */
  ensureSoloBroadcast: SoloBroadcast;
  /** Create a stream and return the token for it */
  ensureStream: Scalars['String']['output'];
  /** Ask users into a call; their open apps ring */
  inviteToCall: Call;
  /** Join a solo broadcast and return the token for it */
  joinBroadcast: Scalars['String']['output'];
  /** Join a call and return the token for it */
  joinCall: Scalars['String']['output'];
};


export type MutationDismissCallInviteArgs = {
  input: DismissCallInviteInput;
};


export type MutationEnsureCallArgs = {
  input: EnsureCallInput;
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


export type MutationInviteToCallArgs = {
  input: InviteToCallInput;
};


export type MutationJoinBroadcastArgs = {
  input: JoinBroadcastInput;
};


export type MutationJoinCallArgs = {
  input: JoinCallInput;
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

export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Get a call by ID */
  call: Call;
  /** The organization's calls; filter `live` for the ones in progress */
  calls: Array<Call>;
  /** Get a collaborative broadcast by ID */
  collaborativeBroadcast: CollaborativeBroadcast;
  /** Get all collaborative broadcasts */
  collaborativeBroadcasts: Array<CollaborativeBroadcast>;
  /** Your pending invitations to calls that are still live */
  myCallInvites: Array<CallInvite>;
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


export type QueryCallArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCallsArgs = {
  filters?: InputMaybe<CallFilter>;
  order?: InputMaybe<CallOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
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

/** A reference to an object on another service */
export type Structure = {
  __typename?: 'Structure';
  identifier: Scalars['String']['output'];
  object: Scalars['Int']['output'];
};

/** A reference to an object on another service */
export type StructureInput = {
  identifier: Scalars['String']['input'];
  object: Scalars['Int']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Your invitations to calls as they arrive and go away */
  callInvites: CallInviteEvent;
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

export type CallParticipantFragment = { __typename?: 'CallParticipant', identity: string, name: string, joinedAt: number };

export type CallStructureFragment = { __typename?: 'Structure', identifier: string, object: number };

export type CallFragment = { __typename?: 'Call', id: string, title: string, roomName: string, createdAt: any, creator?: { __typename?: 'User', id: string, sub: string, preferredUsername: string } | null, about: Array<(
    { __typename?: 'Structure' }
    & CallStructureFragment
  )>, participants: Array<(
    { __typename?: 'CallParticipant' }
    & CallParticipantFragment
  )> };

export type ListCallFragment = { __typename?: 'Call', id: string, title: string, roomName: string, createdAt: any, participantCount: number, creator?: { __typename?: 'User', id: string, sub: string, preferredUsername: string } | null, about: Array<(
    { __typename?: 'Structure' }
    & CallStructureFragment
  )> };

export type CallInviteFragment = { __typename?: 'CallInvite', id: string, createdAt: any, call: (
    { __typename?: 'Call' }
    & ListCallFragment
  ), inviter: { __typename?: 'User', id: string, sub: string, preferredUsername: string } };

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

export type EnsureCallMutationVariables = Exact<{
  input: EnsureCallInput;
}>;


export type EnsureCallMutation = { __typename?: 'Mutation', ensureCall: (
    { __typename?: 'Call' }
    & CallFragment
  ) };

export type JoinCallMutationVariables = Exact<{
  input: JoinCallInput;
}>;


export type JoinCallMutation = { __typename?: 'Mutation', joinCall: string };

export type InviteToCallMutationVariables = Exact<{
  input: InviteToCallInput;
}>;


export type InviteToCallMutation = { __typename?: 'Mutation', inviteToCall: { __typename?: 'Call', id: string } };

export type DismissCallInviteMutationVariables = Exact<{
  input: DismissCallInviteInput;
}>;


export type DismissCallInviteMutation = { __typename?: 'Mutation', dismissCallInvite: string };

export type JoinBroadcastMutationVariables = Exact<{
  input: JoinBroadcastInput;
}>;


export type JoinBroadcastMutation = { __typename?: 'Mutation', joinBroadcast: string };

export type EnsureStreamMutationVariables = Exact<{
  input: EnsureStreamInput;
}>;


export type EnsureStreamMutation = { __typename?: 'Mutation', ensureStream: string };

export type GetCallQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetCallQuery = { __typename?: 'Query', call: (
    { __typename?: 'Call' }
    & CallFragment
  ) };

export type ListCallsQueryVariables = Exact<{
  filter?: InputMaybe<CallFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListCallsQuery = { __typename?: 'Query', calls: Array<(
    { __typename?: 'Call' }
    & ListCallFragment
  )> };

export type CallParticipantsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CallParticipantsQuery = { __typename?: 'Query', call: { __typename?: 'Call', id: string, participants: Array<(
      { __typename?: 'CallParticipant' }
      & CallParticipantFragment
    )> } };

export type MyCallInvitesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyCallInvitesQuery = { __typename?: 'Query', myCallInvites: Array<(
    { __typename?: 'CallInvite' }
    & CallInviteFragment
  )> };

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

export type WatchCallInvitesSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchCallInvitesSubscription = { __typename?: 'Subscription', callInvites: { __typename?: 'CallInviteEvent', delete?: string | null, create?: (
      { __typename?: 'CallInvite' }
      & CallInviteFragment
    ) | null } };

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
export const CallStructureFragmentDoc = gql`
    fragment CallStructure on Structure {
  identifier
  object
}
    `;
export const CallParticipantFragmentDoc = gql`
    fragment CallParticipant on CallParticipant {
  identity
  name
  joinedAt
}
    `;
export const CallFragmentDoc = gql`
    fragment Call on Call {
  id
  title
  roomName
  createdAt
  creator {
    id
    sub
    preferredUsername
  }
  about {
    ...CallStructure
  }
  participants {
    ...CallParticipant
  }
}
    ${CallStructureFragmentDoc}
${CallParticipantFragmentDoc}`;
export const ListCallFragmentDoc = gql`
    fragment ListCall on Call {
  id
  title
  roomName
  createdAt
  creator {
    id
    sub
    preferredUsername
  }
  about {
    ...CallStructure
  }
  participantCount
}
    ${CallStructureFragmentDoc}`;
export const CallInviteFragmentDoc = gql`
    fragment CallInvite on CallInvite {
  id
  createdAt
  call {
    ...ListCall
  }
  inviter {
    id
    sub
    preferredUsername
  }
}
    ${ListCallFragmentDoc}`;
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
export const EnsureCallDocument = gql`
    mutation EnsureCall($input: EnsureCallInput!) {
  ensureCall(input: $input) {
    ...Call
  }
}
    ${CallFragmentDoc}`;
export type EnsureCallMutationFn = Apollo.MutationFunction<EnsureCallMutation, EnsureCallMutationVariables>;

/**
 * __useEnsureCallMutation__
 *
 * To run a mutation, you first call `useEnsureCallMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureCallMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureCallMutation, { data, loading, error }] = useEnsureCallMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useEnsureCallMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<EnsureCallMutation, EnsureCallMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<EnsureCallMutation, EnsureCallMutationVariables>(EnsureCallDocument, options);
      }
export type EnsureCallMutationHookResult = ReturnType<typeof useEnsureCallMutation>;
export type EnsureCallMutationResult = Apollo.MutationResult<EnsureCallMutation>;
export type EnsureCallMutationOptions = Apollo.BaseMutationOptions<EnsureCallMutation, EnsureCallMutationVariables>;
export const JoinCallDocument = gql`
    mutation JoinCall($input: JoinCallInput!) {
  joinCall(input: $input)
}
    `;
export type JoinCallMutationFn = Apollo.MutationFunction<JoinCallMutation, JoinCallMutationVariables>;

/**
 * __useJoinCallMutation__
 *
 * To run a mutation, you first call `useJoinCallMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJoinCallMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [joinCallMutation, { data, loading, error }] = useJoinCallMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useJoinCallMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<JoinCallMutation, JoinCallMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<JoinCallMutation, JoinCallMutationVariables>(JoinCallDocument, options);
      }
export type JoinCallMutationHookResult = ReturnType<typeof useJoinCallMutation>;
export type JoinCallMutationResult = Apollo.MutationResult<JoinCallMutation>;
export type JoinCallMutationOptions = Apollo.BaseMutationOptions<JoinCallMutation, JoinCallMutationVariables>;
export const InviteToCallDocument = gql`
    mutation InviteToCall($input: InviteToCallInput!) {
  inviteToCall(input: $input) {
    id
  }
}
    `;
export type InviteToCallMutationFn = Apollo.MutationFunction<InviteToCallMutation, InviteToCallMutationVariables>;

/**
 * __useInviteToCallMutation__
 *
 * To run a mutation, you first call `useInviteToCallMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInviteToCallMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [inviteToCallMutation, { data, loading, error }] = useInviteToCallMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useInviteToCallMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<InviteToCallMutation, InviteToCallMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<InviteToCallMutation, InviteToCallMutationVariables>(InviteToCallDocument, options);
      }
export type InviteToCallMutationHookResult = ReturnType<typeof useInviteToCallMutation>;
export type InviteToCallMutationResult = Apollo.MutationResult<InviteToCallMutation>;
export type InviteToCallMutationOptions = Apollo.BaseMutationOptions<InviteToCallMutation, InviteToCallMutationVariables>;
export const DismissCallInviteDocument = gql`
    mutation DismissCallInvite($input: DismissCallInviteInput!) {
  dismissCallInvite(input: $input)
}
    `;
export type DismissCallInviteMutationFn = Apollo.MutationFunction<DismissCallInviteMutation, DismissCallInviteMutationVariables>;

/**
 * __useDismissCallInviteMutation__
 *
 * To run a mutation, you first call `useDismissCallInviteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDismissCallInviteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dismissCallInviteMutation, { data, loading, error }] = useDismissCallInviteMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDismissCallInviteMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DismissCallInviteMutation, DismissCallInviteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DismissCallInviteMutation, DismissCallInviteMutationVariables>(DismissCallInviteDocument, options);
      }
export type DismissCallInviteMutationHookResult = ReturnType<typeof useDismissCallInviteMutation>;
export type DismissCallInviteMutationResult = Apollo.MutationResult<DismissCallInviteMutation>;
export type DismissCallInviteMutationOptions = Apollo.BaseMutationOptions<DismissCallInviteMutation, DismissCallInviteMutationVariables>;
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
export const GetCallDocument = gql`
    query GetCall($id: ID!) {
  call(id: $id) {
    ...Call
  }
}
    ${CallFragmentDoc}`;

/**
 * __useGetCallQuery__
 *
 * To run a query within a React component, call `useGetCallQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCallQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCallQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetCallQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetCallQuery, GetCallQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetCallQuery, GetCallQueryVariables>(GetCallDocument, options);
      }
export function useGetCallLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetCallQuery, GetCallQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetCallQuery, GetCallQueryVariables>(GetCallDocument, options);
        }
export type GetCallQueryHookResult = ReturnType<typeof useGetCallQuery>;
export type GetCallLazyQueryHookResult = ReturnType<typeof useGetCallLazyQuery>;
export type GetCallQueryResult = Apollo.QueryResult<GetCallQuery, GetCallQueryVariables>;
export const ListCallsDocument = gql`
    query ListCalls($filter: CallFilter, $pagination: OffsetPaginationInput) {
  calls(filters: $filter, pagination: $pagination, order: {createdAt: DESC}) {
    ...ListCall
  }
}
    ${ListCallFragmentDoc}`;

/**
 * __useListCallsQuery__
 *
 * To run a query within a React component, call `useListCallsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListCallsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListCallsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListCallsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListCallsQuery, ListCallsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListCallsQuery, ListCallsQueryVariables>(ListCallsDocument, options);
      }
export function useListCallsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListCallsQuery, ListCallsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListCallsQuery, ListCallsQueryVariables>(ListCallsDocument, options);
        }
export type ListCallsQueryHookResult = ReturnType<typeof useListCallsQuery>;
export type ListCallsLazyQueryHookResult = ReturnType<typeof useListCallsLazyQuery>;
export type ListCallsQueryResult = Apollo.QueryResult<ListCallsQuery, ListCallsQueryVariables>;
export const CallParticipantsDocument = gql`
    query CallParticipants($id: ID!) {
  call(id: $id) {
    id
    participants {
      ...CallParticipant
    }
  }
}
    ${CallParticipantFragmentDoc}`;

/**
 * __useCallParticipantsQuery__
 *
 * To run a query within a React component, call `useCallParticipantsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCallParticipantsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCallParticipantsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCallParticipantsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<CallParticipantsQuery, CallParticipantsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<CallParticipantsQuery, CallParticipantsQueryVariables>(CallParticipantsDocument, options);
      }
export function useCallParticipantsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<CallParticipantsQuery, CallParticipantsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<CallParticipantsQuery, CallParticipantsQueryVariables>(CallParticipantsDocument, options);
        }
export type CallParticipantsQueryHookResult = ReturnType<typeof useCallParticipantsQuery>;
export type CallParticipantsLazyQueryHookResult = ReturnType<typeof useCallParticipantsLazyQuery>;
export type CallParticipantsQueryResult = Apollo.QueryResult<CallParticipantsQuery, CallParticipantsQueryVariables>;
export const MyCallInvitesDocument = gql`
    query MyCallInvites {
  myCallInvites {
    ...CallInvite
  }
}
    ${CallInviteFragmentDoc}`;

/**
 * __useMyCallInvitesQuery__
 *
 * To run a query within a React component, call `useMyCallInvitesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyCallInvitesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyCallInvitesQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyCallInvitesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MyCallInvitesQuery, MyCallInvitesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyCallInvitesQuery, MyCallInvitesQueryVariables>(MyCallInvitesDocument, options);
      }
export function useMyCallInvitesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyCallInvitesQuery, MyCallInvitesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyCallInvitesQuery, MyCallInvitesQueryVariables>(MyCallInvitesDocument, options);
        }
export type MyCallInvitesQueryHookResult = ReturnType<typeof useMyCallInvitesQuery>;
export type MyCallInvitesLazyQueryHookResult = ReturnType<typeof useMyCallInvitesLazyQuery>;
export type MyCallInvitesQueryResult = Apollo.QueryResult<MyCallInvitesQuery, MyCallInvitesQueryVariables>;
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
export const WatchCallInvitesDocument = gql`
    subscription WatchCallInvites {
  callInvites {
    create {
      ...CallInvite
    }
    delete
  }
}
    ${CallInviteFragmentDoc}`;

/**
 * __useWatchCallInvitesSubscription__
 *
 * To run a query within a React component, call `useWatchCallInvitesSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchCallInvitesSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchCallInvitesSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchCallInvitesSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<WatchCallInvitesSubscription, WatchCallInvitesSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<WatchCallInvitesSubscription, WatchCallInvitesSubscriptionVariables>(WatchCallInvitesDocument, options);
      }
export type WatchCallInvitesSubscriptionHookResult = ReturnType<typeof useWatchCallInvitesSubscription>;
export type WatchCallInvitesSubscriptionResult = Apollo.SubscriptionResult<WatchCallInvitesSubscription>;