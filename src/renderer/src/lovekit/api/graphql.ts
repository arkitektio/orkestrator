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
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

/** What a call is now also about */
export type AddToCallInput = {
  about: Array<StructureInput>;
  call: Scalars['ID']['input'];
};

/** An app instance that owns live streams: one per client, user and organization */
export type Agent = {
  __typename?: 'Agent';
  client: Client;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Whether the agent publishes any of its streams right now. */
  live: Scalars['Boolean']['output'];
  /** What the agent is called: its client's name, or its client id. */
  name: Scalars['String']['output'];
  /** The LiveKit room the agent's streams are tracks in. */
  roomName: Scalars['String']['output'];
  /** Every stream the agent offers, as it declared them last */
  streams: Array<Stream>;
  user: User;
};


/** An app instance that owns live streams: one per client, user and organization */
export type AgentStreamsArgs = {
  filters?: InputMaybe<StreamFilter>;
  order?: InputMaybe<StreamOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Filter for agents */
export type AgentFilter = {
  AND?: InputMaybe<AgentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AgentFilter>;
  OR?: InputMaybe<AgentFilter>;
  /** Agents running as this client (its OAuth client id), as rekuest knows it too. */
  clientId?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  /** Agents running for this user (the `sub` their token carries). */
  userSub?: InputMaybe<Scalars['String']['input']>;
};

export type App = {
  __typename?: 'App';
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
};

export type Call = {
  __typename?: 'Call';
  /** The structures this call is about, oldest first: the last one is what it turned to most recently. */
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

/** A call starting in your organization, or changing what it is about */
export type CallEvent = {
  __typename?: 'CallEvent';
  /** A call someone else just started, which you can join */
  create?: Maybe<Call>;
  /** A call that turned to something else; what it was about before is still in `about` */
  update?: Maybe<Call>;
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

/** What a guest granted it sees of the organization: the objects put in it, and what is part of them. */
export type Collaboration = {
  __typename?: 'Collaboration';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** What is in the collaboration; what is part of these is in it too */
  items: Array<CollaborationItem>;
  name: Scalars['String']['output'];
};

/** One object in a collaboration: put there, or brought along with one that needs it to be seen. */
export type CollaborationItem = {
  __typename?: 'CollaborationItem';
  addedAt: Scalars['DateTime']['output'];
  /** Whether it is in the collaboration only as what another object in it needs to be seen */
  brought: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** The structure the object is known by across the hub: @mikro/scene */
  identifier?: Maybe<Scalars['String']['output']>;
  /** The object's id, in its structure */
  objectId: Scalars['String']['output'];
};

/** An object to put in, or take out of, a collaboration */
export type CollaborationObjectInput = {
  collaboration: Scalars['ID']['input'];
  /** The structure the object is known by: @mikro/scene */
  identifier: Scalars['String']['input'];
  /** The object's id */
  object: Scalars['ID']['input'];
};

/** A new collaboration */
export type CreateCollaborationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

/** Every stream an agent offers */
export type DeclareStreamsInput = {
  streams: Array<StreamDeclarationInput>;
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

/** Who to ask into a call */
export type InviteToCallInput = {
  call: Scalars['ID']['input'];
  /** The users to invite, by their lok id (the `sub` their token carries) */
  users: Array<Scalars['ID']['input']>;
};

/** The call to join */
export type JoinCallInput = {
  call: Scalars['ID']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Turn a call to these structures: they become what it is about last, and what it was about stays */
  addToCall: Call;
  /** Put an agent or a stream in a collaboration: an agent brings every stream it offers */
  addToCollaboration: Collaboration;
  /** Create an empty collaboration, to put agents and streams in and grant a guest */
  createCollaboration: Collaboration;
  /** Offer exactly these streams as the caller's agent: undeclared ones are removed, unchanged ones untouched */
  declareStreams: Array<Stream>;
  /** Delete a collaboration: whoever was granted it sees nothing of it any more */
  deleteCollaboration: Scalars['ID']['output'];
  /** Put an invitation away, on every device */
  dismissCallInvite: Scalars['ID']['output'];
  /** The live call about these structures, or a new one */
  ensureCall: Call;
  /** Ask users into a call; their open apps ring */
  inviteToCall: Call;
  /** Join a call and return the token for it */
  joinCall: Scalars['String']['output'];
  /** A token for the caller's agent to publish its streams; a newer connection replaces an older one */
  publishToken: Scalars['String']['output'];
  /** Take an agent or a stream out of a collaboration */
  removeFromCollaboration: Collaboration;
  /** A token to watch every stream of an agent. A guest needs the agent in one of their collaborations */
  watchAgent: Scalars['String']['output'];
  /** A token to watch a stream: its agent's room, where it is the track named by its key. A guest needs the agent in one of their collaborations */
  watchStream: Scalars['String']['output'];
};


export type MutationAddToCallArgs = {
  input: AddToCallInput;
};


export type MutationAddToCollaborationArgs = {
  input: CollaborationObjectInput;
};


export type MutationCreateCollaborationArgs = {
  input: CreateCollaborationInput;
};


export type MutationDeclareStreamsArgs = {
  input: DeclareStreamsInput;
};


export type MutationDeleteCollaborationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDismissCallInviteArgs = {
  input: DismissCallInviteInput;
};


export type MutationEnsureCallArgs = {
  input: EnsureCallInput;
};


export type MutationInviteToCallArgs = {
  input: InviteToCallInput;
};


export type MutationJoinCallArgs = {
  input: JoinCallInput;
};


export type MutationRemoveFromCollaborationArgs = {
  input: CollaborationObjectInput;
};


export type MutationWatchAgentArgs = {
  input: WatchAgentInput;
};


export type MutationWatchStreamArgs = {
  input: WatchStreamInput;
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
  /** The organization across issuers and services: `<issuer>#<org>` */
  identifier: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Get an agent by ID */
  agent: Agent;
  /** The organization's agents that offer streams */
  agents: Array<Agent>;
  /** Get a call by ID */
  call: Call;
  /** The organization's calls; filter `live` for the ones in progress */
  calls: Array<Call>;
  /** Get a single collaboration by ID */
  collaboration: Collaboration;
  /** List the organization's collaborations: what a guest granted one sees of it (a guest: the collaborations granted to them) */
  collaborations: Array<Collaboration>;
  /** Your pending invitations to calls that are still live */
  myCallInvites: Array<CallInvite>;
  /** Get a stream by ID */
  stream: Stream;
  /** The streams of the organization's agents; filter `live` for the ones being published */
  streams: Array<Stream>;
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryAgentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAgentsArgs = {
  filters?: InputMaybe<AgentFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCallArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCallsArgs = {
  filters?: InputMaybe<CallFilter>;
  order?: InputMaybe<CallOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCollaborationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryStreamArgs = {
  id: Scalars['ID']['input'];
};


export type QueryStreamsArgs = {
  filters?: InputMaybe<StreamFilter>;
  order?: InputMaybe<StreamOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type Release = {
  __typename?: 'Release';
  app: App;
  id: Scalars['ID']['output'];
  version: Scalars['String']['output'];
};

/** One live source an agent offers: a camera, a detector, a microphone */
export type Stream = {
  __typename?: 'Stream';
  agent: Agent;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@lovekit/stream_kind`). The keys are the ones lovekit declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  /** The agent's name for the stream, the same across its restarts: the name of the LiveKit track it is published as */
  key: Scalars['String']['output'];
  kind: StreamKind;
  /** Whether the agent publishes this stream right now: LiveKit's answer, asked when read. */
  live: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
};

/** One stream an agent offers */
export type StreamDeclarationInput = {
  /** What the stream shows */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The agent's own name for the stream, the same on every start; its LiveKit track is published under this name */
  key: Scalars['String']['input'];
  /** Whether it is video or audio */
  kind?: StreamKind;
  /** What the stream is called; the key when not given */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** A stream an agent of your organization declared, changed or no longer offers */
export type StreamEvent = {
  __typename?: 'StreamEvent';
  /** A stream an agent declared for the first time */
  create?: Maybe<Stream>;
  /** A stream its agent no longer offers */
  delete?: Maybe<Scalars['ID']['output']>;
  /** A stream whose title, kind or description changed */
  update?: Maybe<Stream>;
};

/** Filter for streams */
export type StreamFilter = {
  AND?: InputMaybe<StreamFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<StreamFilter>;
  OR?: InputMaybe<StreamFilter>;
  /** Streams of this agent. */
  agent?: InputMaybe<Scalars['ID']['input']>;
  /** Streams of the agent running as this client (its OAuth client id), as rekuest knows it too. */
  clientId?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only streams their agent publishes right now (true), or does not (false). */
  live?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  /** Streams of agents running for this user (the `sub` their token carries). */
  userSub?: InputMaybe<Scalars['String']['input']>;
};

/** What a stream carries */
export enum StreamKind {
  Audio = 'AUDIO',
  Video = 'VIDEO'
}

export type StreamOrder =
  { createdAt: Ordering; title?: never; }
  |  { createdAt?: never; title: Ordering; };

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
  /** The calls others start in your organization as they start, and any call's new topics */
  calls: CallEvent;
  /** Streams your organization's agents declare, change and drop, as they do */
  streams: StreamEvent;
};

export type User = {
  __typename?: 'User';
  activeOrganization?: Maybe<Organization>;
  /** The family name, if the issuer sends one. */
  familyName?: Maybe<Scalars['String']['output']>;
  /** The given name, if the issuer sends one. */
  givenName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The user's locale (BCP47), if the issuer sends one. */
  locale?: Maybe<Scalars['String']['output']>;
  /** The full name, if the issuer sends one. */
  name?: Maybe<Scalars['String']['output']>;
  /** A casual name, if the issuer sends one. */
  nickname?: Maybe<Scalars['String']['output']>;
  /** URL of the profile picture, if the issuer sends one. */
  picture?: Maybe<Scalars['String']['output']>;
  preferredUsername: Scalars['String']['output'];
  sub: Scalars['String']['output'];
  /** The user's IANA time zone, if the issuer sends one. */
  zoneinfo?: Maybe<Scalars['String']['output']>;
};

/** The agent whose streams to watch */
export type WatchAgentInput = {
  agent: Scalars['ID']['input'];
};

/** The stream to watch */
export type WatchStreamInput = {
  stream: Scalars['ID']['input'];
};

export type _Entity = App | Client | Organization | Release | User;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type AgentOwnerFragment = { __typename?: 'Agent', id: string, name: string, roomName: string, user: { __typename?: 'User', id: string, sub: string, preferredUsername: string }, client: { __typename?: 'Client', id: string, clientId: string, release?: { __typename?: 'Release', id: string, version: string, app: { __typename?: 'App', id: string, identifier: string } } | null } };

export type AgentFragment = (
  { __typename?: 'Agent', createdAt: any, live: boolean, streams: Array<(
    { __typename?: 'Stream' }
    & ListStreamFragment
  )> }
  & AgentOwnerFragment
);

export type ListAgentFragment = (
  { __typename?: 'Agent', live: boolean }
  & AgentOwnerFragment
);

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

export type StreamFragment = { __typename?: 'Stream', id: string, key: string, title: string, kind: StreamKind, description?: string | null, createdAt: any, live: boolean, agent: (
    { __typename?: 'Agent' }
    & AgentOwnerFragment
  ) };

export type ListStreamFragment = { __typename?: 'Stream', id: string, key: string, title: string, kind: StreamKind, live: boolean, agent: (
    { __typename?: 'Agent' }
    & AgentOwnerFragment
  ) };

export type EnsureCallMutationVariables = Exact<{
  input: EnsureCallInput;
}>;


export type EnsureCallMutation = { __typename?: 'Mutation', ensureCall: (
    { __typename?: 'Call' }
    & CallFragment
  ) };

export type AddToCallMutationVariables = Exact<{
  input: AddToCallInput;
}>;


export type AddToCallMutation = { __typename?: 'Mutation', addToCall: (
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

export type WatchStreamMutationVariables = Exact<{
  input: WatchStreamInput;
}>;


export type WatchStreamMutation = { __typename?: 'Mutation', watchStream: string };

export type WatchAgentMutationVariables = Exact<{
  input: WatchAgentInput;
}>;


export type WatchAgentMutation = { __typename?: 'Mutation', watchAgent: string };

export type GetAgentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetAgentQuery = { __typename?: 'Query', agent: (
    { __typename?: 'Agent' }
    & AgentFragment
  ) };

export type SearchAgentsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchAgentsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Agent', value: string, label: string }> };

export type ListAgentsQueryVariables = Exact<{
  filter?: InputMaybe<AgentFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListAgentsQuery = { __typename?: 'Query', agents: Array<(
    { __typename?: 'Agent' }
    & ListAgentFragment
  )> };

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

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', streams: Array<(
    { __typename?: 'Stream' }
    & ListStreamFragment
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
    & ListStreamFragment
  )> };

export type WatchCallInvitesSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchCallInvitesSubscription = { __typename?: 'Subscription', callInvites: { __typename?: 'CallInviteEvent', delete?: string | null, create?: (
      { __typename?: 'CallInvite' }
      & CallInviteFragment
    ) | null } };

export type WatchCallsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchCallsSubscription = { __typename?: 'Subscription', calls: { __typename?: 'CallEvent', create?: (
      { __typename?: 'Call' }
      & ListCallFragment
    ) | null, update?: (
      { __typename?: 'Call' }
      & ListCallFragment
    ) | null } };

export type WatchStreamsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchStreamsSubscription = { __typename?: 'Subscription', streams: { __typename?: 'StreamEvent', delete?: string | null, create?: (
      { __typename?: 'Stream' }
      & ListStreamFragment
    ) | null, update?: (
      { __typename?: 'Stream' }
      & ListStreamFragment
    ) | null } };

export const AgentOwnerFragmentDoc = gql`
    fragment AgentOwner on Agent {
  id
  name
  roomName
  user {
    id
    sub
    preferredUsername
  }
  client {
    id
    clientId
    release {
      id
      version
      app {
        id
        identifier
      }
    }
  }
}
    `;
export const ListStreamFragmentDoc = gql`
    fragment ListStream on Stream {
  id
  key
  title
  kind
  live
  agent {
    ...AgentOwner
  }
}
    ${AgentOwnerFragmentDoc}`;
export const AgentFragmentDoc = gql`
    fragment Agent on Agent {
  ...AgentOwner
  createdAt
  live
  streams {
    ...ListStream
  }
}
    ${AgentOwnerFragmentDoc}
${ListStreamFragmentDoc}`;
export const ListAgentFragmentDoc = gql`
    fragment ListAgent on Agent {
  ...AgentOwner
  live
}
    ${AgentOwnerFragmentDoc}`;
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
  key
  title
  kind
  description
  createdAt
  live
  agent {
    ...AgentOwner
  }
}
    ${AgentOwnerFragmentDoc}`;
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
export const AddToCallDocument = gql`
    mutation AddToCall($input: AddToCallInput!) {
  addToCall(input: $input) {
    ...Call
  }
}
    ${CallFragmentDoc}`;
export type AddToCallMutationFn = Apollo.MutationFunction<AddToCallMutation, AddToCallMutationVariables>;

/**
 * __useAddToCallMutation__
 *
 * To run a mutation, you first call `useAddToCallMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddToCallMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addToCallMutation, { data, loading, error }] = useAddToCallMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddToCallMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AddToCallMutation, AddToCallMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AddToCallMutation, AddToCallMutationVariables>(AddToCallDocument, options);
      }
export type AddToCallMutationHookResult = ReturnType<typeof useAddToCallMutation>;
export type AddToCallMutationResult = Apollo.MutationResult<AddToCallMutation>;
export type AddToCallMutationOptions = Apollo.BaseMutationOptions<AddToCallMutation, AddToCallMutationVariables>;
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
export const WatchStreamDocument = gql`
    mutation WatchStream($input: WatchStreamInput!) {
  watchStream(input: $input)
}
    `;
export type WatchStreamMutationFn = Apollo.MutationFunction<WatchStreamMutation, WatchStreamMutationVariables>;

/**
 * __useWatchStreamMutation__
 *
 * To run a mutation, you first call `useWatchStreamMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useWatchStreamMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [watchStreamMutation, { data, loading, error }] = useWatchStreamMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useWatchStreamMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<WatchStreamMutation, WatchStreamMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<WatchStreamMutation, WatchStreamMutationVariables>(WatchStreamDocument, options);
      }
export type WatchStreamMutationHookResult = ReturnType<typeof useWatchStreamMutation>;
export type WatchStreamMutationResult = Apollo.MutationResult<WatchStreamMutation>;
export type WatchStreamMutationOptions = Apollo.BaseMutationOptions<WatchStreamMutation, WatchStreamMutationVariables>;
export const WatchAgentDocument = gql`
    mutation WatchAgent($input: WatchAgentInput!) {
  watchAgent(input: $input)
}
    `;
export type WatchAgentMutationFn = Apollo.MutationFunction<WatchAgentMutation, WatchAgentMutationVariables>;

/**
 * __useWatchAgentMutation__
 *
 * To run a mutation, you first call `useWatchAgentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useWatchAgentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [watchAgentMutation, { data, loading, error }] = useWatchAgentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useWatchAgentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<WatchAgentMutation, WatchAgentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<WatchAgentMutation, WatchAgentMutationVariables>(WatchAgentDocument, options);
      }
export type WatchAgentMutationHookResult = ReturnType<typeof useWatchAgentMutation>;
export type WatchAgentMutationResult = Apollo.MutationResult<WatchAgentMutation>;
export type WatchAgentMutationOptions = Apollo.BaseMutationOptions<WatchAgentMutation, WatchAgentMutationVariables>;
export const GetAgentDocument = gql`
    query GetAgent($id: ID!) {
  agent(id: $id) {
    ...Agent
  }
}
    ${AgentFragmentDoc}`;

/**
 * __useGetAgentQuery__
 *
 * To run a query within a React component, call `useGetAgentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAgentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetAgentQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetAgentQuery, GetAgentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetAgentQuery, GetAgentQueryVariables>(GetAgentDocument, options);
      }
export function useGetAgentLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetAgentQuery, GetAgentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetAgentQuery, GetAgentQueryVariables>(GetAgentDocument, options);
        }
export type GetAgentQueryHookResult = ReturnType<typeof useGetAgentQuery>;
export type GetAgentLazyQueryHookResult = ReturnType<typeof useGetAgentLazyQuery>;
export type GetAgentQueryResult = Apollo.QueryResult<GetAgentQuery, GetAgentQueryVariables>;
export const SearchAgentsDocument = gql`
    query SearchAgents($search: String, $values: [ID!]) {
  options: agents(
    filters: {search: $search, ids: $values}
    pagination: {limit: 10}
  ) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchAgentsQuery__
 *
 * To run a query within a React component, call `useSearchAgentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchAgentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchAgentsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchAgentsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchAgentsQuery, SearchAgentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchAgentsQuery, SearchAgentsQueryVariables>(SearchAgentsDocument, options);
      }
export function useSearchAgentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchAgentsQuery, SearchAgentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchAgentsQuery, SearchAgentsQueryVariables>(SearchAgentsDocument, options);
        }
export type SearchAgentsQueryHookResult = ReturnType<typeof useSearchAgentsQuery>;
export type SearchAgentsLazyQueryHookResult = ReturnType<typeof useSearchAgentsLazyQuery>;
export type SearchAgentsQueryResult = Apollo.QueryResult<SearchAgentsQuery, SearchAgentsQueryVariables>;
export const ListAgentsDocument = gql`
    query ListAgents($filter: AgentFilter, $pagination: OffsetPaginationInput) {
  agents(filters: $filter, pagination: $pagination) {
    ...ListAgent
  }
}
    ${ListAgentFragmentDoc}`;

/**
 * __useListAgentsQuery__
 *
 * To run a query within a React component, call `useListAgentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListAgentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListAgentsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListAgentsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListAgentsQuery, ListAgentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListAgentsQuery, ListAgentsQueryVariables>(ListAgentsDocument, options);
      }
export function useListAgentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListAgentsQuery, ListAgentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListAgentsQuery, ListAgentsQueryVariables>(ListAgentsDocument, options);
        }
export type ListAgentsQueryHookResult = ReturnType<typeof useListAgentsQuery>;
export type ListAgentsLazyQueryHookResult = ReturnType<typeof useListAgentsLazyQuery>;
export type ListAgentsQueryResult = Apollo.QueryResult<ListAgentsQuery, ListAgentsQueryVariables>;
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
    ...ListStream
  }
}
    ${ListStreamFragmentDoc}`;

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
export const WatchCallsDocument = gql`
    subscription WatchCalls {
  calls {
    create {
      ...ListCall
    }
    update {
      ...ListCall
    }
  }
}
    ${ListCallFragmentDoc}`;

/**
 * __useWatchCallsSubscription__
 *
 * To run a query within a React component, call `useWatchCallsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchCallsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchCallsSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchCallsSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<WatchCallsSubscription, WatchCallsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<WatchCallsSubscription, WatchCallsSubscriptionVariables>(WatchCallsDocument, options);
      }
export type WatchCallsSubscriptionHookResult = ReturnType<typeof useWatchCallsSubscription>;
export type WatchCallsSubscriptionResult = Apollo.SubscriptionResult<WatchCallsSubscription>;
export const WatchStreamsDocument = gql`
    subscription WatchStreams {
  streams {
    create {
      ...ListStream
    }
    update {
      ...ListStream
    }
    delete
  }
}
    ${ListStreamFragmentDoc}`;

/**
 * __useWatchStreamsSubscription__
 *
 * To run a query within a React component, call `useWatchStreamsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchStreamsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchStreamsSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchStreamsSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<WatchStreamsSubscription, WatchStreamsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<WatchStreamsSubscription, WatchStreamsSubscriptionVariables>(WatchStreamsDocument, options);
      }
export type WatchStreamsSubscriptionHookResult = ReturnType<typeof useWatchStreamsSubscription>;
export type WatchStreamsSubscriptionResult = Apollo.SubscriptionResult<WatchStreamsSubscription>;