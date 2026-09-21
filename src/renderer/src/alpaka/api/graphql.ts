import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lib/alpaka/funcs';
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
  /** Base64EncodedString represents an untyped options object returned by the Dask Gateway API. */
  Base64EncodedString: { input: any; output: any; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /** Decimal (fixed-point) */
  Decimal: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

/** Documents to add to an existing collection */
export type AddDocumentsToCollectionInput = {
  collection: Scalars['ID']['input'];
  documents: Array<DocumentInput>;
};

/** A participant in a room */
export type Agent = {
  __typename?: 'Agent';
  client: Client;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  /** The room this agent participates in */
  room: Room;
  /** The user this agent acts on behalf of */
  user: User;
};

/** Agent(id, room, name, client, user) */
export type AgentFilter = {
  AND?: InputMaybe<AgentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AgentFilter>;
  OR?: InputMaybe<AgentFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type AgentOrder =
  { name: Ordering; };

/** An App model to represent an application in the system */
export type App = {
  __typename?: 'App';
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
};

/** Text to append to a streaming message */
export type AppendMessageInput = {
  delta: Scalars['String']['input'];
  message: Scalars['ID']['input'];
};

/** A cap on LLM consumption per period */
export type Budget = {
  __typename?: 'Budget';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  /** Block calls once exceeded; otherwise only log a warning */
  hard: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** Maximum cost in USD per period */
  limitCost?: Maybe<Scalars['Decimal']['output']>;
  /** Maximum total tokens per period */
  limitTokens?: Maybe<Scalars['Int']['output']>;
  /** The model this budget is restricted to, or null for every model */
  model?: Maybe<LlmModel>;
  period: BudgetPeriod;
  /** How much of this budget is used in the current period */
  status: BudgetStatus;
  /** The user this budget is restricted to, or null for the whole organization */
  user?: Maybe<User>;
};

/** Filter for budgets */
export type BudgetFilter = {
  AND?: InputMaybe<BudgetFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BudgetFilter>;
  OR?: InputMaybe<BudgetFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  model?: InputMaybe<Scalars['ID']['input']>;
  period?: InputMaybe<BudgetPeriod>;
  user?: InputMaybe<Scalars['ID']['input']>;
};

export type BudgetOrder =
  { createdAt: Ordering; };

/** The window a budget is measured over */
export enum BudgetPeriod {
  Day = 'DAY',
  Month = 'MONTH',
  Week = 'WEEK'
}

/** How much of a budget is used in the current period */
export type BudgetStatus = {
  __typename?: 'BudgetStatus';
  exceeded: Scalars['Boolean']['output'];
  limitCost?: Maybe<Scalars['Decimal']['output']>;
  limitTokens?: Maybe<Scalars['Int']['output']>;
  periodEnd: Scalars['DateTime']['output'];
  periodStart: Scalars['DateTime']['output'];
  remainingCost?: Maybe<Scalars['Decimal']['output']>;
  remainingTokens?: Maybe<Scalars['Int']['output']>;
  usedCost: Scalars['Decimal']['output'];
  usedTokens: Scalars['Int']['output'];
};

/** A chat completion request */
export type ChatInput = {
  frequencyPenalty?: InputMaybe<Scalars['Float']['input']>;
  maxTokens?: InputMaybe<Scalars['Int']['input']>;
  messages: Array<ChatMessageInput>;
  model?: InputMaybe<Scalars['ID']['input']>;
  n?: InputMaybe<Scalars['Int']['input']>;
  presencePenalty?: InputMaybe<Scalars['Float']['input']>;
  responseFormat?: InputMaybe<Scalars['JSON']['input']>;
  stop?: InputMaybe<Array<Scalars['String']['input']>>;
  temperature?: InputMaybe<Scalars['Float']['input']>;
  toolChoice?: InputMaybe<Scalars['JSON']['input']>;
  tools?: InputMaybe<Array<ToolInput>>;
  topP?: InputMaybe<Scalars['Float']['input']>;
};

export type ChatMessage = {
  __typename?: 'ChatMessage';
  content?: Maybe<Scalars['String']['output']>;
  functionCall?: Maybe<FunctionCall>;
  name?: Maybe<Scalars['String']['output']>;
  role: Role;
  toolCallId?: Maybe<Scalars['String']['output']>;
  toolCalls?: Maybe<Array<ToolCall>>;
};

/** A chat message input */
export type ChatMessageInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  functionCall?: InputMaybe<FunctionCallInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  role: Role;
  toolCallId?: InputMaybe<Scalars['String']['input']>;
  toolCalls?: InputMaybe<Array<ToolCallInput>>;
};

export type ChatResponse = {
  __typename?: 'ChatResponse';
  choices: Array<Choice>;
  created: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  model: Scalars['String']['output'];
  object: Scalars['String']['output'];
  systemFingerprint?: Maybe<Scalars['String']['output']>;
  usage?: Maybe<Usage>;
};

export type Choice = {
  __typename?: 'Choice';
  finishReason?: Maybe<Scalars['String']['output']>;
  index: Scalars['Int']['output'];
  message: ChatMessage;
  reasoningContent?: Maybe<Scalars['String']['output']>;
  thinkingBlocks?: Maybe<Array<ThinkingBlock>>;
};

/** A collection of documents searchable by string */
export type ChromaCollection = {
  __typename?: 'ChromaCollection';
  /** The number of documents stored in this collection, or null if the vector database cannot be reached */
  count?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  /** The model used to embed this collection's documents */
  embedder: LlmModel;
  id: Scalars['ID']['output'];
  /** The human-readable name of the collection, unique within its organization */
  name: Scalars['String']['output'];
  owner?: Maybe<User>;
};

/** Filter for ChromaCollection */
export type ChromaCollectionFilter = {
  AND?: InputMaybe<ChromaCollectionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ChromaCollectionFilter>;
  OR?: InputMaybe<ChromaCollectionFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Search by name: a case-insensitive substring, or semantic similarity of the query to the collection's name and description. Substring matches rank first, then by similarity; an explicit `ordering` replaces that ranking. */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A collection of documents searchable by string */
export type ChromaCollectionInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  embedder: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type ChromaCollectionOrder =
  { createdAt: Ordering; name?: never; }
  |  { createdAt?: never; name: Ordering; };

/**
 * An Oauth2 Client
 *
 * An Oauth2 Client is a model to represent an Oauth2 client that is
 * registered when a JWT token is authenticated. It retrieves
 * the client_id from the token and uses it to create a new
 * app or retrieve an existing app. This allows for the grouping
 * of users by app.
 */
export type Client = {
  __typename?: 'Client';
  clientId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  release?: Maybe<Release>;
};

/** A budget to create */
export type CreateBudgetInput = {
  hard?: Scalars['Boolean']['input'];
  limitCost?: InputMaybe<Scalars['Decimal']['input']>;
  limitTokens?: InputMaybe<Scalars['Int']['input']>;
  model?: InputMaybe<Scalars['ID']['input']>;
  period?: BudgetPeriod;
  user?: InputMaybe<Scalars['ID']['input']>;
};

/** The room to create */
export type CreateRoomInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  talkingAbout?: InputMaybe<Array<StructureInput>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

/** A task a model can be made the default for */
export enum DefaultKind {
  Embedding = 'EMBEDDING',
  ImageGeneration = 'IMAGE_GENERATION',
  TextGeneration = 'TEXT_GENERATION'
}

/** A default use for a model */
export type DefaultUse = {
  __typename?: 'DefaultUse';
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  model: LlmModel;
};

/** Filter for DefaultUse */
export type DefaultUseFilter = {
  AND?: InputMaybe<DefaultUseFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DefaultUseFilter>;
  OR?: InputMaybe<DefaultUseFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type DefaultUseOrder =
  { kind: Ordering; };

/** The budget to delete */
export type DeleteBudgetInput = {
  id: Scalars['ID']['input'];
};

/** The collection to delete */
export type DeleteCollectionInput = {
  id: Scalars['ID']['input'];
};

/** The provider to delete */
export type DeleteProviderInput = {
  id: Scalars['ID']['input'];
};

/** The room to delete */
export type DeleteRoomInput = {
  id: Scalars['ID']['input'];
};

/** A document stored in a collection */
export type Document = {
  __typename?: 'Document';
  content: Scalars['String']['output'];
  distance?: Maybe<Scalars['Float']['output']>;
  id: Scalars['String']['output'];
  /** The metadata stored alongside the document */
  metadata?: Maybe<Scalars['JSON']['output']>;
  /** The object this document was derived from, if any */
  structure?: Maybe<Structure>;
};

/** A document to put into the vector database */
export type DocumentInput = {
  content: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  structure?: InputMaybe<StructureInput>;
};

/** A capability a model supports */
export enum FeatureType {
  Chat = 'CHAT',
  Embedding = 'EMBEDDING',
  Vision = 'VISION'
}

/** Close a streaming message */
export type FinishMessageInput = {
  attachStructures?: InputMaybe<Array<StructureInput>>;
  message: Scalars['ID']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
};

/** The type of the tool */
export type FunctionCall = {
  __typename?: 'FunctionCall';
  arguments: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

/** A function call input */
export type FunctionCallInput = {
  arguments: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

/** A large language model function defintion */
export type FunctionDefinitionInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  parameters?: InputMaybe<Scalars['JSON']['input']>;
};

export enum Granularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Month = 'MONTH',
  Quarter = 'QUARTER',
  Week = 'WEEK',
  Year = 'YEAR'
}

/** The image */
export type ImageInput = {
  description: Scalars['String']['input'];
  model?: InputMaybe<Scalars['ID']['input']>;
};

/** A generated image, base64 encoded */
export type ImageResponse = {
  __typename?: 'ImageResponse';
  image: Scalars['Base64EncodedString']['output'];
};

/** A LLM model to chage with */
export type LlmModel = {
  __typename?: 'LLMModel';
  /** The collections that can be embedded with this model */
  embedderFor: Array<ChromaCollection>;
  /** The features supported by the model */
  features: Array<FeatureType>;
  id: Scalars['ID']['output'];
  /** The modalities this model accepts as input */
  inputModalities: Array<Modality>;
  label: Scalars['String']['output'];
  /** The string to use for the LLM model */
  llmString: Scalars['String']['output'];
  modelId: Scalars['String']['output'];
  /** The modalities this model produces as output */
  outputModalities: Array<Modality>;
  provider: Provider;
};


/** A LLM model to chage with */
export type LlmModelEmbedderForArgs = {
  filters?: InputMaybe<ChromaCollectionFilter>;
  ordering?: Array<ChromaCollectionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Filter for LLMModel */
export type LlmModelFilter = {
  AND?: InputMaybe<LlmModelFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<LlmModelFilter>;
  OR?: InputMaybe<LlmModelFilter>;
  features?: InputMaybe<Array<FeatureType>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  inputModalities?: InputMaybe<Array<Modality>>;
  outputModalities?: InputMaybe<Array<Modality>>;
  provider?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type LlmModelOrder =
  { label: Ordering; modelId?: never; }
  |  { label?: never; modelId: Ordering; };

/** Message represent the message of an agent on a room */
export type Message = {
  __typename?: 'Message';
  /** The user that created this comment */
  agent: Agent;
  /** The objects this message was posted about */
  attachedStructures: Array<Structure>;
  before: Array<Message>;
  /** The time this comment got created */
  createdAt: Scalars['DateTime']['output'];
  /** The rich-text representation of the message */
  descendants: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  /** The message this one replies to, if any */
  isReplyTo?: Maybe<Message>;
  /** Whether this message is still being written */
  isStreaming: Scalars['Boolean']['output'];
  /** The messages replying to this one */
  replies: Array<Message>;
  room: Room;
  /** The agents this message is addressed to */
  targets: Array<Agent>;
  /** A clear text representation of the rich comment */
  text: Scalars['String']['output'];
  title: Scalars['String']['output'];
};


/** Message represent the message of an agent on a room */
export type MessageBeforeArgs = {
  filters?: InputMaybe<MessageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Message represent the message of an agent on a room */
export type MessageRepliesArgs = {
  filters?: InputMaybe<MessageFilter>;
  ordering?: Array<MessageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Message represent the message of an agent on a room */
export type MessageTargetsArgs = {
  filters?: InputMaybe<AgentFilter>;
  ordering?: Array<AgentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Message represent the message of an agent on a room */
export type MessageFilter = {
  AND?: InputMaybe<MessageFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MessageFilter>;
  OR?: InputMaybe<MessageFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type MessageOrder =
  { createdAt: Ordering; };

/** A modality a model can read or emit */
export enum Modality {
  Audio = 'AUDIO',
  Image = 'IMAGE',
  Text = 'TEXT',
  Video = 'VIDEO'
}

/** The root mutation type */
export type Mutation = {
  __typename?: 'Mutation';
  /** Embed documents and add them to a collection */
  addDocumentsToCollection: Array<Document>;
  /** Append a delta to a streaming message. Batch deltas (every ~100-250 ms or ~30 characters) and await each call before sending the next, so they arrive in order. */
  appendMessage: Message;
  /** Send a chat completion request */
  chat: ChatResponse;
  /** Cap this organization's LLM consumption, optionally for one user and/or model */
  createBudget: Budget;
  /** Create a searchable collection of documents */
  createCollection: ChromaCollection;
  /** Configure a new LLM provider and list the models it offers */
  createProvider: Provider;
  /** Open a new room */
  createRoom: Room;
  /** Remove a budget */
  deleteBudget: Scalars['ID']['output'];
  /** Delete a collection and its documents */
  deleteCollection: Scalars['ID']['output'];
  /** Delete a provider and the models it offers */
  deleteProvider: Scalars['ID']['output'];
  /** Delete a room and its messages */
  deleteRoom: Scalars['ID']['output'];
  /** Create a collection, or update it if it already exists */
  ensureCollection: ChromaCollection;
  /** Close a streaming message. Pass the full final text so any delta lost on the way is repaired; call it in a finally block so a crashed stream never stays open. */
  finishMessage: Message;
  /** Generate an image from a text description */
  generateImage: ImageResponse;
  /** Pull a model into an Ollama provider */
  pull: OllamaPullResult;
  /** Re-list the models a provider offers */
  refreshProvider: Provider;
  /** Post a complete message into a room */
  send: Message;
  /** Open a message to stream text into. Only the starting agent (same user and client) can append to or finish it. */
  startMessage: Message;
  /** Change a budget's period, limits or hardness */
  updateBudget: Budget;
  /** Update a provider in place, e.g. to rotate its credential */
  updateProvider: Provider;
  /** Register a model as the caller's default for a kind of task */
  useModelFor: DefaultUse;
};


/** The root mutation type */
export type MutationAddDocumentsToCollectionArgs = {
  input: AddDocumentsToCollectionInput;
};


/** The root mutation type */
export type MutationAppendMessageArgs = {
  input: AppendMessageInput;
};


/** The root mutation type */
export type MutationChatArgs = {
  input: ChatInput;
};


/** The root mutation type */
export type MutationCreateBudgetArgs = {
  input: CreateBudgetInput;
};


/** The root mutation type */
export type MutationCreateCollectionArgs = {
  input: ChromaCollectionInput;
};


/** The root mutation type */
export type MutationCreateProviderArgs = {
  input: ProviderInput;
};


/** The root mutation type */
export type MutationCreateRoomArgs = {
  input: CreateRoomInput;
};


/** The root mutation type */
export type MutationDeleteBudgetArgs = {
  input: DeleteBudgetInput;
};


/** The root mutation type */
export type MutationDeleteCollectionArgs = {
  input: DeleteCollectionInput;
};


/** The root mutation type */
export type MutationDeleteProviderArgs = {
  input: DeleteProviderInput;
};


/** The root mutation type */
export type MutationDeleteRoomArgs = {
  input: DeleteRoomInput;
};


/** The root mutation type */
export type MutationEnsureCollectionArgs = {
  input: ChromaCollectionInput;
};


/** The root mutation type */
export type MutationFinishMessageArgs = {
  input: FinishMessageInput;
};


/** The root mutation type */
export type MutationGenerateImageArgs = {
  input: ImageInput;
};


/** The root mutation type */
export type MutationPullArgs = {
  input: PullInput;
};


/** The root mutation type */
export type MutationRefreshProviderArgs = {
  input: RefreshProviderInput;
};


/** The root mutation type */
export type MutationSendArgs = {
  input: SendMessageInput;
};


/** The root mutation type */
export type MutationStartMessageArgs = {
  input: StartMessageInput;
};


/** The root mutation type */
export type MutationUpdateBudgetArgs = {
  input: UpdateBudgetInput;
};


/** The root mutation type */
export type MutationUpdateProviderArgs = {
  input: UpdateProviderInput;
};


/** The root mutation type */
export type MutationUseModelForArgs = {
  input: UseModelForInput;
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

/** The outcome of pulling a model */
export type OllamaPullResult = {
  __typename?: 'OllamaPullResult';
  detail?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export enum Ordering {
  Asc = 'ASC',
  AscNullsFirst = 'ASC_NULLS_FIRST',
  AscNullsLast = 'ASC_NULLS_LAST',
  Desc = 'DESC',
  DescNullsFirst = 'DESC_NULLS_FIRST',
  DescNullsLast = 'DESC_NULLS_LAST'
}

/** An Organization model to represent an organization in the system */
export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
};

/** A provider of LLMs */
export type Provider = {
  __typename?: 'Provider';
  /** Provider configuration, with credential-bearing keys redacted. */
  additionalConfig?: Maybe<Scalars['JSON']['output']>;
  apiBase?: Maybe<Scalars['String']['output']>;
  /** Whether an API key is configured for this provider. The key itself is never exposed. */
  hasApiKey: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** The kind of the provider */
  kind: ProviderKind;
  models: Array<LlmModel>;
  name: Scalars['String']['output'];
};


/** A provider of LLMs */
export type ProviderModelsArgs = {
  filters?: InputMaybe<LlmModelFilter>;
  ordering?: Array<LlmModelOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Filter for Provider */
export type ProviderFilter = {
  AND?: InputMaybe<ProviderFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ProviderFilter>;
  OR?: InputMaybe<ProviderFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A large language model to change with */
export type ProviderInput = {
  additionalConfig?: InputMaybe<Scalars['JSON']['input']>;
  apiBase?: InputMaybe<Scalars['String']['input']>;
  apiKey?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  kind: ProviderKind;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** The kind of LLM provider */
export enum ProviderKind {
  Anthropic = 'ANTHROPIC',
  Anyscale = 'ANYSCALE',
  Aws = 'AWS',
  Azure = 'AZURE',
  Cohere = 'COHERE',
  Custom = 'CUSTOM',
  Deepinfra = 'DEEPINFRA',
  FireworksAi = 'FIREWORKS_AI',
  Google = 'GOOGLE',
  Groq = 'GROQ',
  Huggingface = 'HUGGINGFACE',
  Mistral = 'MISTRAL',
  Ollama = 'OLLAMA',
  Openai = 'OPENAI',
  Openrouter = 'OPENROUTER',
  Palm = 'PALM',
  Perplexity = 'PERPLEXITY',
  Replicate = 'REPLICATE',
  TogetherAi = 'TOGETHER_AI',
  Unknown = 'UNKNOWN',
  VertexAi = 'VERTEX_AI'
}

export type ProviderOrder =
  { createdAt: Ordering; name?: never; }
  |  { createdAt?: never; name: Ordering; };

/** The model to pull, and the provider to pull it into */
export type PullInput = {
  modelName: Scalars['String']['input'];
  provider?: InputMaybe<Scalars['ID']['input']>;
};

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Get a single budget by ID */
  budget: Budget;
  /** How much of a budget is used in the current period */
  budgetStatus: BudgetStatus;
  /** This organization's budgets */
  budgets: Array<Budget>;
  /** Get a single Chroma collection by ID */
  chromaCollection: ChromaCollection;
  /** List this organization's Chroma collections */
  chromaCollections: Array<ChromaCollection>;
  /** The model the caller uses by default for one kind of task, if any */
  defaultModelFor?: Maybe<LlmModel>;
  /** The models the caller has registered as defaults */
  defaultUses: Array<DefaultUse>;
  /** Search a collection for the documents most similar to some text */
  documents: Array<Document>;
  /** Get a single LLM model by ID */
  llmModel: LlmModel;
  /** List the LLM models reachable through this organization's providers */
  llmModels: Array<LlmModel>;
  /** Get a single message by ID */
  message: Message;
  /** List the messages in this organization's rooms */
  messages: Array<Message>;
  /** Get a single provider by ID */
  provider: Provider;
  /** List the LLM providers configured for this organization */
  providers: Array<Provider>;
  /** Get a single room by ID */
  room: Room;
  /** Aggregate statistics over this organization's rooms */
  roomStats: RoomStats;
  /** List the rooms in this organization */
  rooms: Array<Room>;
  /** This organization's recorded LLM calls */
  usageRecords: Array<UsageRecord>;
  /** Aggregate token, cost and latency statistics over this organization's LLM calls */
  usageStats: UsageStats;
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryBudgetArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBudgetStatusArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBudgetsArgs = {
  filters?: InputMaybe<BudgetFilter>;
  ordering?: Array<BudgetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryChromaCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryChromaCollectionsArgs = {
  filters?: InputMaybe<ChromaCollectionFilter>;
  ordering?: Array<ChromaCollectionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDefaultModelForArgs = {
  kind: DefaultKind;
};


export type QueryDefaultUsesArgs = {
  filters?: InputMaybe<DefaultUseFilter>;
  ordering?: Array<DefaultUseOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDocumentsArgs = {
  input: QueryInput;
};


export type QueryLlmModelArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLlmModelsArgs = {
  filters?: InputMaybe<LlmModelFilter>;
  ordering?: Array<LlmModelOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMessageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMessagesArgs = {
  filters?: InputMaybe<MessageFilter>;
  ordering?: Array<MessageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryProviderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProvidersArgs = {
  filters?: InputMaybe<ProviderFilter>;
  ordering?: Array<ProviderOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryRoomArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRoomStatsArgs = {
  filters?: InputMaybe<RoomFilter>;
};


export type QueryRoomsArgs = {
  filters?: InputMaybe<RoomFilter>;
  ordering?: Array<RoomOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryUsageRecordsArgs = {
  filters?: InputMaybe<UsageRecordFilter>;
  ordering?: Array<UsageRecordOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryUsageStatsArgs = {
  filters?: InputMaybe<UsageRecordFilter>;
};

/** A similarity query against a collection */
export type QueryInput = {
  collection: Scalars['ID']['input'];
  /** Results per query text */
  nResults?: Scalars['Int']['input'];
  /** One or more query texts; the union of their results is returned, deduplicated by document */
  queryTexts: Array<Scalars['String']['input']>;
  /** Chroma metadata filter applied to every query */
  where?: InputMaybe<Scalars['JSON']['input']>;
};

/** The provider whose model list should be re-synced */
export type RefreshProviderInput = {
  id: Scalars['ID']['input'];
};

/** A Release model to represent a release of an application in the system */
export type Release = {
  __typename?: 'Release';
  app: App;
  id: Scalars['ID']['output'];
  version: Scalars['String']['output'];
};

/** The type of the message sender */
export enum Role {
  Assistant = 'ASSISTANT',
  Function = 'FUNCTION',
  System = 'SYSTEM',
  Tool = 'TOOL',
  User = 'USER'
}

/** A room agents and users converse in */
export type Room = {
  __typename?: 'Room';
  /** The room this agent participates in */
  agents: Array<Agent>;
  /** The time this room got created */
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  messages: Array<Message>;
  /** The organization this room belongs to */
  organization: Organization;
  /** The Title of the Room */
  title: Scalars['String']['output'];
};


/** A room agents and users converse in */
export type RoomAgentsArgs = {
  filters?: InputMaybe<AgentFilter>;
  ordering?: Array<AgentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A room agents and users converse in */
export type RoomMessagesArgs = {
  filters?: InputMaybe<MessageFilter>;
  ordering?: Array<MessageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Something that happened in a room */
export type RoomEvent = {
  __typename?: 'RoomEvent';
  /** The agent that joined, for JOIN events */
  join?: Maybe<Agent>;
  kind: RoomEventKind;
  /** The agent that left, for LEAVE events */
  leave?: Maybe<Agent>;
  /** The message, for MESSAGE_* events */
  message?: Maybe<Message>;
};

/** What happened in a room */
export enum RoomEventKind {
  Join = 'JOIN',
  Leave = 'LEAVE',
  MessageCreated = 'MESSAGE_CREATED',
  MessageFinished = 'MESSAGE_FINISHED',
  MessageUpdated = 'MESSAGE_UPDATED'
}

/** Numeric/aggregatable fields of Room */
export enum RoomField {
  CreatedAt = 'CREATED_AT'
}

/** A conversation; embeds its title + description so the room list's ``search`` finds it by topic. */
export type RoomFilter = {
  AND?: InputMaybe<RoomFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RoomFilter>;
  OR?: InputMaybe<RoomFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Search by title: a case-insensitive substring, or semantic similarity of the query to the room's title and description. Substring matches rank first, then by similarity; an explicit `ordering` replaces that ranking. */
  search?: InputMaybe<Scalars['String']['input']>;
  talkingAbout?: InputMaybe<StructureInput>;
};

export type RoomOrder =
  { createdAt: Ordering; title?: never; }
  |  { createdAt?: never; title: Ordering; };

export type RoomStats = {
  __typename?: 'RoomStats';
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


export type RoomStatsAvgArgs = {
  field: RoomField;
};


export type RoomStatsDistinctCountArgs = {
  field: RoomField;
};


export type RoomStatsMaxArgs = {
  field: RoomField;
};


export type RoomStatsMinArgs = {
  field: RoomField;
};


export type RoomStatsSeriesArgs = {
  by: Granularity;
  field: RoomField;
  timestampField: RoomTimestampField;
};


export type RoomStatsSumArgs = {
  field: RoomField;
};

/** Datetime fields of Room for bucketing */
export enum RoomTimestampField {
  CreatedAt = 'CREATED_AT'
}

/** The message to send */
export type SendMessageInput = {
  agentId: Scalars['String']['input'];
  attachStructures?: InputMaybe<Array<StructureInput>>;
  parent?: InputMaybe<Scalars['ID']['input']>;
  room: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};

/** Open a message that text will be streamed into */
export type StartMessageInput = {
  agentId: Scalars['String']['input'];
  parent?: InputMaybe<Scalars['ID']['input']>;
  room: Scalars['ID']['input'];
  text?: Scalars['String']['input'];
};

/** A reference to an object held by another Arkitekt service */
export type Structure = {
  __typename?: 'Structure';
  identifier: Scalars['String']['output'];
  object: Scalars['Int']['output'];
};

/** A reference to an object held by another Arkitekt service */
export type StructureInput = {
  identifier: Scalars['String']['input'];
  object: Scalars['Int']['input'];
};

/** The root subscription type */
export type Subscription = {
  __typename?: 'Subscription';
  /** Join a room and receive its events: messages created, streamed into and finished, and agents joining or leaving */
  room: RoomEvent;
};


/** The root subscription type */
export type SubscriptionRoomArgs = {
  agentId: Scalars['ID']['input'];
  filterOwn?: Scalars['Boolean']['input'];
  room: Scalars['ID']['input'];
};

export type ThinkingBlock = {
  __typename?: 'ThinkingBlock';
  signature?: Maybe<Scalars['String']['output']>;
  thinking: Scalars['String']['output'];
  type: ThinkingBlockType;
};

/** The type of the thinking block */
export enum ThinkingBlockType {
  Thinking = 'THINKING'
}

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

/** A function definition for a large language model */
export type ToolCall = {
  __typename?: 'ToolCall';
  function: FunctionCall;
  id: Scalars['String']['output'];
  type: ToolType;
};

/** A tool call input */
export type ToolCallInput = {
  function: FunctionCallInput;
  id: Scalars['String']['input'];
  type: ToolType;
};

/** A large language model function call */
export type ToolInput = {
  function: FunctionDefinitionInput;
  type?: ToolType;
};

/** The type of the tool */
export enum ToolType {
  Function = 'FUNCTION'
}

/** Changes to a budget; omitted fields are left as they are, explicit nulls clear a limit */
export type UpdateBudgetInput = {
  hard?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  limitCost?: InputMaybe<Scalars['Decimal']['input']>;
  limitTokens?: InputMaybe<Scalars['Int']['input']>;
  period?: InputMaybe<BudgetPeriod>;
};

/** The provider to update, and the fields to change */
export type UpdateProviderInput = {
  additionalConfig?: InputMaybe<Scalars['JSON']['input']>;
  apiBase?: InputMaybe<Scalars['String']['input']>;
  apiKey?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type Usage = {
  __typename?: 'Usage';
  completionTokenDetails?: Maybe<Scalars['JSON']['output']>;
  completionTokens: Scalars['Int']['output'];
  promptTokenDetails?: Maybe<Scalars['JSON']['output']>;
  promptTokens: Scalars['Int']['output'];
  totalTokens: Scalars['Int']['output'];
};

/** The entry point an LLM call came through */
export enum UsageEndpoint {
  GraphqlChat = 'GRAPHQL_CHAT',
  GraphqlImage = 'GRAPHQL_IMAGE',
  RestChat = 'REST_CHAT',
  RestCompletion = 'REST_COMPLETION',
  RestEmbedding = 'REST_EMBEDDING',
  VectorEmbedding = 'VECTOR_EMBEDDING'
}

/** Numeric/aggregatable fields of UsageRecord */
export enum UsageField {
  CompletionTokens = 'COMPLETION_TOKENS',
  Cost = 'COST',
  LatencyMs = 'LATENCY_MS',
  PromptTokens = 'PROMPT_TOKENS',
  TotalTokens = 'TOTAL_TOKENS'
}

/** One LLM call, as recorded by the gateway */
export type UsageRecord = {
  __typename?: 'UsageRecord';
  /** The client the call came through */
  client?: Maybe<Client>;
  completionTokens: Scalars['Int']['output'];
  /** Cost in USD as reported or estimated by litellm; null when the model is not in its price map */
  cost?: Maybe<Scalars['Decimal']['output']>;
  createdAt: Scalars['DateTime']['output'];
  endpoint: UsageEndpoint;
  errorType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  latencyMs?: Maybe<Scalars['Int']['output']>;
  llmString: Scalars['String']['output'];
  /** The model that was called, if it still exists */
  model?: Maybe<LlmModel>;
  /** The provider-side model id at the time of the call */
  modelIdentifier: Scalars['String']['output'];
  promptTokens: Scalars['Int']['output'];
  providerKind: Scalars['String']['output'];
  status: UsageStatus;
  totalTokens: Scalars['Int']['output'];
  /** The user who made the call */
  user?: Maybe<User>;
};

/** Filter for usage records */
export type UsageRecordFilter = {
  AND?: InputMaybe<UsageRecordFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<UsageRecordFilter>;
  OR?: InputMaybe<UsageRecordFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  endpoint?: InputMaybe<UsageEndpoint>;
  endpoints?: InputMaybe<Array<UsageEndpoint>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  model?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<UsageStatus>;
  user?: InputMaybe<Scalars['ID']['input']>;
};

export type UsageRecordOrder =
  { cost: Ordering; createdAt?: never; latencyMs?: never; totalTokens?: never; }
  |  { cost?: never; createdAt: Ordering; latencyMs?: never; totalTokens?: never; }
  |  { cost?: never; createdAt?: never; latencyMs: Ordering; totalTokens?: never; }
  |  { cost?: never; createdAt?: never; latencyMs?: never; totalTokens: Ordering; };

export type UsageStats = {
  __typename?: 'UsageStats';
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


export type UsageStatsAvgArgs = {
  field: UsageField;
};


export type UsageStatsDistinctCountArgs = {
  field: UsageField;
};


export type UsageStatsMaxArgs = {
  field: UsageField;
};


export type UsageStatsMinArgs = {
  field: UsageField;
};


export type UsageStatsSeriesArgs = {
  by: Granularity;
  field: UsageField;
  timestampField: UsageTimestampField;
};


export type UsageStatsSumArgs = {
  field: UsageField;
};

/** Whether an LLM call succeeded */
export enum UsageStatus {
  Aborted = 'ABORTED',
  Error = 'ERROR',
  Ok = 'OK'
}

/** Datetime fields of UsageRecord for bucketing */
export enum UsageTimestampField {
  CreatedAt = 'CREATED_AT'
}

/** The input for using a model for a specific task */
export type UseModelForInput = {
  kind: DefaultKind;
  model: Scalars['ID']['input'];
};

/** A reflection on the real User */
export type User = {
  __typename?: 'User';
  activeOrganization?: Maybe<Organization>;
  id: Scalars['ID']['output'];
  preferredUsername: Scalars['String']['output'];
  sub: Scalars['String']['output'];
};

export type _Entity = Agent | App | Client | Message | Organization | Release | Room | User;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type ChromaCollectionFragment = { __typename?: 'ChromaCollection', id: string, name: string, description: string, createdAt: any, count?: number | null, embedder: { __typename?: 'LLMModel', id: string, label: string, llmString: string } };

export type ListChromaCollectionFragment = { __typename?: 'ChromaCollection', id: string, name: string, description: string, count?: number | null };

export type DocumentFragment = { __typename?: 'Document', id: string, content: string, metadata?: any | null, distance?: number | null, structure?: { __typename?: 'Structure', identifier: string, object: number } | null };

export type LlmModelFragment = { __typename?: 'LLMModel', id: string, modelId: string, llmString: string, features: Array<FeatureType>, inputModalities: Array<Modality>, outputModalities: Array<Modality>, provider: (
    { __typename?: 'Provider' }
    & ProviderFragment
  ), embedderFor: Array<{ __typename?: 'ChromaCollection', id: string, name: string }> };

export type ListLlmModelFragment = { __typename?: 'LLMModel', id: string, modelId: string, llmString: string, features: Array<FeatureType>, inputModalities: Array<Modality>, outputModalities: Array<Modality>, provider: { __typename?: 'Provider', id: string, name: string, kind: ProviderKind }, embedderFor: Array<{ __typename?: 'ChromaCollection', id: string, name: string }> };

export type MessageAgentFragment = { __typename?: 'Agent', id: string, name?: string | null, user: { __typename?: 'User', id: string, preferredUsername: string } };

export type MessageFragment = { __typename?: 'Message', id: string, text: string, isStreaming: boolean, createdAt: any, agent: (
    { __typename?: 'Agent' }
    & MessageAgentFragment
  ), attachedStructures: Array<{ __typename?: 'Structure', identifier: string, object: number }> };

export type ListMessageFragment = { __typename?: 'Message', id: string, text: string, isStreaming: boolean, createdAt: any, agent: (
    { __typename?: 'Agent' }
    & MessageAgentFragment
  ), attachedStructures: Array<{ __typename?: 'Structure', identifier: string, object: number }> };

export type ProviderFragment = { __typename?: 'Provider', id: string, name: string, kind: ProviderKind, models: Array<{ __typename?: 'LLMModel', id: string, modelId: string }> };

export type ListProviderFragment = { __typename?: 'Provider', id: string, name: string, kind: ProviderKind, models: Array<{ __typename?: 'LLMModel', id: string, modelId: string }> };

export type ChatResponseFragment = { __typename?: 'ChatResponse', id: string, object: string, created: number, model: string, usage?: { __typename?: 'Usage', promptTokens: number, completionTokens: number, totalTokens: number } | null, choices: Array<{ __typename?: 'Choice', index: number, finishReason?: string | null, message: { __typename?: 'ChatMessage', role: Role, content?: string | null, name?: string | null, toolCallId?: string | null, functionCall?: { __typename?: 'FunctionCall', name: string, arguments: string } | null, toolCalls?: Array<{ __typename?: 'ToolCall', id: string, type: ToolType, function: { __typename?: 'FunctionCall', name: string, arguments: string } }> | null } }> };

export type RoomFragment = { __typename?: 'Room', id: string, title: string, description?: string | null, createdAt: any, creator?: { __typename?: 'User', id: string, preferredUsername: string } | null, organization: { __typename?: 'Organization', id: string, slug: string }, agents: Array<{ __typename?: 'Agent', id: string, name?: string | null, user: { __typename?: 'User', id: string, preferredUsername: string } }>, messages: Array<(
    { __typename?: 'Message' }
    & ListMessageFragment
  )> };

export type ListRoomFragment = { __typename?: 'Room', id: string, title: string, description?: string | null };

export type RecentRoomFragment = { __typename?: 'Room', id: string, title: string, description?: string | null, createdAt: any, latest: Array<{ __typename?: 'Message', id: string, text: string, createdAt: any, attachedStructures: Array<{ __typename?: 'Structure', identifier: string, object: number }> }> };

export type ChatMutationVariables = Exact<{
  input: ChatInput;
}>;


export type ChatMutation = { __typename?: 'Mutation', chat: (
    { __typename?: 'ChatResponse' }
    & ChatResponseFragment
  ) };

export type CreateCollectionMutationVariables = Exact<{
  input: ChromaCollectionInput;
}>;


export type CreateCollectionMutation = { __typename?: 'Mutation', createCollection: (
    { __typename?: 'ChromaCollection' }
    & ChromaCollectionFragment
  ) };

export type EnsureCollectionMutationVariables = Exact<{
  input: ChromaCollectionInput;
}>;


export type EnsureCollectionMutation = { __typename?: 'Mutation', ensureCollection: (
    { __typename?: 'ChromaCollection' }
    & ChromaCollectionFragment
  ) };

export type AddDocumentsToCollectionMutationVariables = Exact<{
  input: AddDocumentsToCollectionInput;
}>;


export type AddDocumentsToCollectionMutation = { __typename?: 'Mutation', addDocumentsToCollection: Array<(
    { __typename?: 'Document' }
    & DocumentFragment
  )> };

export type GenerateImageMutationVariables = Exact<{
  input: ImageInput;
}>;


export type GenerateImageMutation = { __typename?: 'Mutation', generateImage: { __typename?: 'ImageResponse', image: any } };

export type SendMessageMutationVariables = Exact<{
  input: SendMessageInput;
}>;


export type SendMessageMutation = { __typename?: 'Mutation', send: (
    { __typename?: 'Message' }
    & MessageFragment
  ) };

export type UseModelForMutationVariables = Exact<{
  input: UseModelForInput;
}>;


export type UseModelForMutation = { __typename?: 'Mutation', useModelFor: { __typename?: 'DefaultUse', model: { __typename?: 'LLMModel', id: string } } };

export type CreateProviderMutationVariables = Exact<{
  input: ProviderInput;
}>;


export type CreateProviderMutation = { __typename?: 'Mutation', createProvider: (
    { __typename?: 'Provider' }
    & ProviderFragment
  ) };

export type DeleteProviderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteProviderMutation = { __typename?: 'Mutation', deleteProvider: string };

export type RefreshProviderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RefreshProviderMutation = { __typename?: 'Mutation', refreshProvider: (
    { __typename?: 'Provider' }
    & ProviderFragment
  ) };

export type PullMutationVariables = Exact<{
  input: PullInput;
}>;


export type PullMutation = { __typename?: 'Mutation', pull: { __typename?: 'OllamaPullResult', status: string, detail?: string | null } };

export type CreateRoomMutationVariables = Exact<{
  input: CreateRoomInput;
}>;


export type CreateRoomMutation = { __typename?: 'Mutation', createRoom: (
    { __typename?: 'Room' }
    & RoomFragment
  ) };

export type DeleteRoomMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteRoomMutation = { __typename?: 'Mutation', deleteRoom: string };

export type GetChromaCollectionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetChromaCollectionQuery = { __typename?: 'Query', chromaCollection: (
    { __typename?: 'ChromaCollection' }
    & ChromaCollectionFragment
  ) };

export type SearchChromaCollectionQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchChromaCollectionQuery = { __typename?: 'Query', options: Array<{ __typename?: 'ChromaCollection', value: string, label: string }> };

export type ListChromaCollectionsQueryVariables = Exact<{
  filter?: InputMaybe<ChromaCollectionFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListChromaCollectionsQuery = { __typename?: 'Query', chromaCollections: Array<(
    { __typename?: 'ChromaCollection' }
    & ListChromaCollectionFragment
  )> };

export type QueryDocumentsQueryVariables = Exact<{
  input: QueryInput;
}>;


export type QueryDocumentsQuery = { __typename?: 'Query', documents: Array<(
    { __typename?: 'Document' }
    & DocumentFragment
  )> };

export type HomePageStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type HomePageStatsQuery = { __typename?: 'Query', roomStats: { __typename?: 'RoomStats', count: number } };

export type GetLlmModelQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetLlmModelQuery = { __typename?: 'Query', llmModel: (
    { __typename?: 'LLMModel' }
    & LlmModelFragment
  ) };

export type SearchLlmModelsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchLlmModelsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'LLMModel', value: string, label: string }> };

export type ListLlModelsQueryVariables = Exact<{
  filter?: InputMaybe<LlmModelFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListLlModelsQuery = { __typename?: 'Query', llmModels: Array<(
    { __typename?: 'LLMModel' }
    & ListLlmModelFragment
  )> };

export type GetMessageQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetMessageQuery = { __typename?: 'Query', message: (
    { __typename?: 'Message', room: { __typename?: 'Room', id: string, title: string } }
    & MessageFragment
  ) };

export type GetProviderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetProviderQuery = { __typename?: 'Query', provider: (
    { __typename?: 'Provider' }
    & ProviderFragment
  ) };

export type SearchProvidersQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchProvidersQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Provider', value: string, label: string }> };

export type ListProvidersQueryVariables = Exact<{
  filter?: InputMaybe<ProviderFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListProvidersQuery = { __typename?: 'Query', providers: Array<(
    { __typename?: 'Provider' }
    & ListProviderFragment
  )> };

export type GetRoomQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetRoomQuery = { __typename?: 'Query', room: (
    { __typename?: 'Room' }
    & RoomFragment
  ) };

export type SearchRoomsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchRoomsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Room', value: string, label: string, description?: string | null }> };

export type ListRoomsQueryVariables = Exact<{
  filter?: InputMaybe<RoomFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListRoomsQuery = { __typename?: 'Query', rooms: Array<(
    { __typename?: 'Room' }
    & RoomFragment
  )> };

export type RoomsQueryVariables = Exact<{ [key: string]: never; }>;


export type RoomsQuery = { __typename?: 'Query', rooms: Array<{ __typename?: 'Room', id: string, title: string, description?: string | null, messages: Array<(
      { __typename?: 'Message' }
      & ListMessageFragment
    )> }> };

export type RecentRoomsQueryVariables = Exact<{
  filter?: InputMaybe<RoomFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type RecentRoomsQuery = { __typename?: 'Query', rooms: Array<(
    { __typename?: 'Room' }
    & RecentRoomFragment
  )> };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  noRooms: Scalars['Boolean']['input'];
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', rooms?: Array<(
    { __typename?: 'Room' }
    & ListRoomFragment
  )> };

export type WatchMessagesSubscriptionVariables = Exact<{
  room: Scalars['ID']['input'];
  agentId: Scalars['ID']['input'];
}>;


export type WatchMessagesSubscription = { __typename?: 'Subscription', room: { __typename?: 'RoomEvent', message?: (
      { __typename?: 'Message' }
      & ListMessageFragment
    ) | null } };

export const ChromaCollectionFragmentDoc = gql`
    fragment ChromaCollection on ChromaCollection {
  id
  name
  description
  createdAt
  count
  embedder {
    id
    label
    llmString
  }
}
    `;
export const ListChromaCollectionFragmentDoc = gql`
    fragment ListChromaCollection on ChromaCollection {
  id
  name
  description
  count
}
    `;
export const DocumentFragmentDoc = gql`
    fragment Document on Document {
  id
  content
  metadata
  distance
  structure {
    identifier
    object
  }
}
    `;
export const ProviderFragmentDoc = gql`
    fragment Provider on Provider {
  id
  name
  models {
    id
    modelId
  }
  kind
}
    `;
export const LlmModelFragmentDoc = gql`
    fragment LLMModel on LLMModel {
  id
  modelId
  llmString
  provider {
    ...Provider
  }
  features
  embedderFor {
    id
    name
  }
  inputModalities
  outputModalities
}
    ${ProviderFragmentDoc}`;
export const ListLlmModelFragmentDoc = gql`
    fragment ListLLMModel on LLMModel {
  id
  modelId
  llmString
  features
  inputModalities
  outputModalities
  provider {
    id
    name
    kind
  }
  embedderFor {
    id
    name
  }
}
    `;
export const MessageAgentFragmentDoc = gql`
    fragment MessageAgent on Agent {
  id
  name
  user {
    id
    preferredUsername
  }
}
    `;
export const MessageFragmentDoc = gql`
    fragment Message on Message {
  id
  text
  isStreaming
  agent {
    ...MessageAgent
  }
  attachedStructures {
    identifier
    object
  }
  createdAt
}
    ${MessageAgentFragmentDoc}`;
export const ListProviderFragmentDoc = gql`
    fragment ListProvider on Provider {
  id
  name
  kind
  models {
    id
    modelId
  }
}
    `;
export const ChatResponseFragmentDoc = gql`
    fragment ChatResponse on ChatResponse {
  id
  object
  created
  model
  usage {
    promptTokens
    completionTokens
    totalTokens
  }
  choices {
    index
    finishReason
    message {
      role
      content
      name
      toolCallId
      functionCall {
        name
        arguments
      }
      toolCalls {
        id
        type
        function {
          name
          arguments
        }
      }
    }
  }
}
    `;
export const ListMessageFragmentDoc = gql`
    fragment ListMessage on Message {
  id
  text
  isStreaming
  agent {
    ...MessageAgent
  }
  attachedStructures {
    identifier
    object
  }
  createdAt
}
    ${MessageAgentFragmentDoc}`;
export const RoomFragmentDoc = gql`
    fragment Room on Room {
  id
  title
  description
  createdAt
  creator {
    id
    preferredUsername
  }
  organization {
    id
    slug
  }
  agents {
    id
    name
    user {
      id
      preferredUsername
    }
  }
  messages {
    ...ListMessage
  }
}
    ${ListMessageFragmentDoc}`;
export const ListRoomFragmentDoc = gql`
    fragment ListRoom on Room {
  id
  title
  description
}
    `;
export const RecentRoomFragmentDoc = gql`
    fragment RecentRoom on Room {
  id
  title
  description
  createdAt
  latest: messages(ordering: [{createdAt: DESC}], pagination: {limit: 1}) {
    id
    text
    createdAt
    attachedStructures {
      identifier
      object
    }
  }
}
    `;
export const ChatDocument = gql`
    mutation Chat($input: ChatInput!) {
  chat(input: $input) {
    ...ChatResponse
  }
}
    ${ChatResponseFragmentDoc}`;
export type ChatMutationFn = Apollo.MutationFunction<ChatMutation, ChatMutationVariables>;

/**
 * __useChatMutation__
 *
 * To run a mutation, you first call `useChatMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChatMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [chatMutation, { data, loading, error }] = useChatMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useChatMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ChatMutation, ChatMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ChatMutation, ChatMutationVariables>(ChatDocument, options);
      }
export type ChatMutationHookResult = ReturnType<typeof useChatMutation>;
export type ChatMutationResult = Apollo.MutationResult<ChatMutation>;
export type ChatMutationOptions = Apollo.BaseMutationOptions<ChatMutation, ChatMutationVariables>;
export const CreateCollectionDocument = gql`
    mutation CreateCollection($input: ChromaCollectionInput!) {
  createCollection(input: $input) {
    ...ChromaCollection
  }
}
    ${ChromaCollectionFragmentDoc}`;
export type CreateCollectionMutationFn = Apollo.MutationFunction<CreateCollectionMutation, CreateCollectionMutationVariables>;

/**
 * __useCreateCollectionMutation__
 *
 * To run a mutation, you first call `useCreateCollectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCollectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCollectionMutation, { data, loading, error }] = useCreateCollectionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCollectionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateCollectionMutation, CreateCollectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateCollectionMutation, CreateCollectionMutationVariables>(CreateCollectionDocument, options);
      }
export type CreateCollectionMutationHookResult = ReturnType<typeof useCreateCollectionMutation>;
export type CreateCollectionMutationResult = Apollo.MutationResult<CreateCollectionMutation>;
export type CreateCollectionMutationOptions = Apollo.BaseMutationOptions<CreateCollectionMutation, CreateCollectionMutationVariables>;
export const EnsureCollectionDocument = gql`
    mutation EnsureCollection($input: ChromaCollectionInput!) {
  ensureCollection(input: $input) {
    ...ChromaCollection
  }
}
    ${ChromaCollectionFragmentDoc}`;
export type EnsureCollectionMutationFn = Apollo.MutationFunction<EnsureCollectionMutation, EnsureCollectionMutationVariables>;

/**
 * __useEnsureCollectionMutation__
 *
 * To run a mutation, you first call `useEnsureCollectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureCollectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureCollectionMutation, { data, loading, error }] = useEnsureCollectionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useEnsureCollectionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<EnsureCollectionMutation, EnsureCollectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<EnsureCollectionMutation, EnsureCollectionMutationVariables>(EnsureCollectionDocument, options);
      }
export type EnsureCollectionMutationHookResult = ReturnType<typeof useEnsureCollectionMutation>;
export type EnsureCollectionMutationResult = Apollo.MutationResult<EnsureCollectionMutation>;
export type EnsureCollectionMutationOptions = Apollo.BaseMutationOptions<EnsureCollectionMutation, EnsureCollectionMutationVariables>;
export const AddDocumentsToCollectionDocument = gql`
    mutation AddDocumentsToCollection($input: AddDocumentsToCollectionInput!) {
  addDocumentsToCollection(input: $input) {
    ...Document
  }
}
    ${DocumentFragmentDoc}`;
export type AddDocumentsToCollectionMutationFn = Apollo.MutationFunction<AddDocumentsToCollectionMutation, AddDocumentsToCollectionMutationVariables>;

/**
 * __useAddDocumentsToCollectionMutation__
 *
 * To run a mutation, you first call `useAddDocumentsToCollectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddDocumentsToCollectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addDocumentsToCollectionMutation, { data, loading, error }] = useAddDocumentsToCollectionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddDocumentsToCollectionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AddDocumentsToCollectionMutation, AddDocumentsToCollectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AddDocumentsToCollectionMutation, AddDocumentsToCollectionMutationVariables>(AddDocumentsToCollectionDocument, options);
      }
export type AddDocumentsToCollectionMutationHookResult = ReturnType<typeof useAddDocumentsToCollectionMutation>;
export type AddDocumentsToCollectionMutationResult = Apollo.MutationResult<AddDocumentsToCollectionMutation>;
export type AddDocumentsToCollectionMutationOptions = Apollo.BaseMutationOptions<AddDocumentsToCollectionMutation, AddDocumentsToCollectionMutationVariables>;
export const GenerateImageDocument = gql`
    mutation GenerateImage($input: ImageInput!) {
  generateImage(input: $input) {
    image
  }
}
    `;
export type GenerateImageMutationFn = Apollo.MutationFunction<GenerateImageMutation, GenerateImageMutationVariables>;

/**
 * __useGenerateImageMutation__
 *
 * To run a mutation, you first call `useGenerateImageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateImageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateImageMutation, { data, loading, error }] = useGenerateImageMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGenerateImageMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<GenerateImageMutation, GenerateImageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<GenerateImageMutation, GenerateImageMutationVariables>(GenerateImageDocument, options);
      }
export type GenerateImageMutationHookResult = ReturnType<typeof useGenerateImageMutation>;
export type GenerateImageMutationResult = Apollo.MutationResult<GenerateImageMutation>;
export type GenerateImageMutationOptions = Apollo.BaseMutationOptions<GenerateImageMutation, GenerateImageMutationVariables>;
export const SendMessageDocument = gql`
    mutation SendMessage($input: SendMessageInput!) {
  send(input: $input) {
    ...Message
  }
}
    ${MessageFragmentDoc}`;
export type SendMessageMutationFn = Apollo.MutationFunction<SendMessageMutation, SendMessageMutationVariables>;

/**
 * __useSendMessageMutation__
 *
 * To run a mutation, you first call `useSendMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendMessageMutation, { data, loading, error }] = useSendMessageMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSendMessageMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SendMessageMutation, SendMessageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SendMessageMutation, SendMessageMutationVariables>(SendMessageDocument, options);
      }
export type SendMessageMutationHookResult = ReturnType<typeof useSendMessageMutation>;
export type SendMessageMutationResult = Apollo.MutationResult<SendMessageMutation>;
export type SendMessageMutationOptions = Apollo.BaseMutationOptions<SendMessageMutation, SendMessageMutationVariables>;
export const UseModelForDocument = gql`
    mutation UseModelFor($input: UseModelForInput!) {
  useModelFor(input: $input) {
    model {
      id
    }
  }
}
    `;
export type UseModelForMutationFn = Apollo.MutationFunction<UseModelForMutation, UseModelForMutationVariables>;

/**
 * __useUseModelForMutation__
 *
 * To run a mutation, you first call `useUseModelForMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUseModelForMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [useModelForMutation, { data, loading, error }] = useUseModelForMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUseModelForMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UseModelForMutation, UseModelForMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UseModelForMutation, UseModelForMutationVariables>(UseModelForDocument, options);
      }
export type UseModelForMutationHookResult = ReturnType<typeof useUseModelForMutation>;
export type UseModelForMutationResult = Apollo.MutationResult<UseModelForMutation>;
export type UseModelForMutationOptions = Apollo.BaseMutationOptions<UseModelForMutation, UseModelForMutationVariables>;
export const CreateProviderDocument = gql`
    mutation CreateProvider($input: ProviderInput!) {
  createProvider(input: $input) {
    ...Provider
  }
}
    ${ProviderFragmentDoc}`;
export type CreateProviderMutationFn = Apollo.MutationFunction<CreateProviderMutation, CreateProviderMutationVariables>;

/**
 * __useCreateProviderMutation__
 *
 * To run a mutation, you first call `useCreateProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createProviderMutation, { data, loading, error }] = useCreateProviderMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateProviderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateProviderMutation, CreateProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateProviderMutation, CreateProviderMutationVariables>(CreateProviderDocument, options);
      }
export type CreateProviderMutationHookResult = ReturnType<typeof useCreateProviderMutation>;
export type CreateProviderMutationResult = Apollo.MutationResult<CreateProviderMutation>;
export type CreateProviderMutationOptions = Apollo.BaseMutationOptions<CreateProviderMutation, CreateProviderMutationVariables>;
export const DeleteProviderDocument = gql`
    mutation DeleteProvider($id: ID!) {
  deleteProvider(input: {id: $id})
}
    `;
export type DeleteProviderMutationFn = Apollo.MutationFunction<DeleteProviderMutation, DeleteProviderMutationVariables>;

/**
 * __useDeleteProviderMutation__
 *
 * To run a mutation, you first call `useDeleteProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteProviderMutation, { data, loading, error }] = useDeleteProviderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteProviderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteProviderMutation, DeleteProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteProviderMutation, DeleteProviderMutationVariables>(DeleteProviderDocument, options);
      }
export type DeleteProviderMutationHookResult = ReturnType<typeof useDeleteProviderMutation>;
export type DeleteProviderMutationResult = Apollo.MutationResult<DeleteProviderMutation>;
export type DeleteProviderMutationOptions = Apollo.BaseMutationOptions<DeleteProviderMutation, DeleteProviderMutationVariables>;
export const RefreshProviderDocument = gql`
    mutation RefreshProvider($id: ID!) {
  refreshProvider(input: {id: $id}) {
    ...Provider
  }
}
    ${ProviderFragmentDoc}`;
export type RefreshProviderMutationFn = Apollo.MutationFunction<RefreshProviderMutation, RefreshProviderMutationVariables>;

/**
 * __useRefreshProviderMutation__
 *
 * To run a mutation, you first call `useRefreshProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRefreshProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [refreshProviderMutation, { data, loading, error }] = useRefreshProviderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRefreshProviderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RefreshProviderMutation, RefreshProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RefreshProviderMutation, RefreshProviderMutationVariables>(RefreshProviderDocument, options);
      }
export type RefreshProviderMutationHookResult = ReturnType<typeof useRefreshProviderMutation>;
export type RefreshProviderMutationResult = Apollo.MutationResult<RefreshProviderMutation>;
export type RefreshProviderMutationOptions = Apollo.BaseMutationOptions<RefreshProviderMutation, RefreshProviderMutationVariables>;
export const PullDocument = gql`
    mutation Pull($input: PullInput!) {
  pull(input: $input) {
    status
    detail
  }
}
    `;
export type PullMutationFn = Apollo.MutationFunction<PullMutation, PullMutationVariables>;

/**
 * __usePullMutation__
 *
 * To run a mutation, you first call `usePullMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePullMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pullMutation, { data, loading, error }] = usePullMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function usePullMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PullMutation, PullMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PullMutation, PullMutationVariables>(PullDocument, options);
      }
export type PullMutationHookResult = ReturnType<typeof usePullMutation>;
export type PullMutationResult = Apollo.MutationResult<PullMutation>;
export type PullMutationOptions = Apollo.BaseMutationOptions<PullMutation, PullMutationVariables>;
export const CreateRoomDocument = gql`
    mutation CreateRoom($input: CreateRoomInput!) {
  createRoom(input: $input) {
    ...Room
  }
}
    ${RoomFragmentDoc}`;
export type CreateRoomMutationFn = Apollo.MutationFunction<CreateRoomMutation, CreateRoomMutationVariables>;

/**
 * __useCreateRoomMutation__
 *
 * To run a mutation, you first call `useCreateRoomMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateRoomMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRoomMutation, { data, loading, error }] = useCreateRoomMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateRoomMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateRoomMutation, CreateRoomMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateRoomMutation, CreateRoomMutationVariables>(CreateRoomDocument, options);
      }
export type CreateRoomMutationHookResult = ReturnType<typeof useCreateRoomMutation>;
export type CreateRoomMutationResult = Apollo.MutationResult<CreateRoomMutation>;
export type CreateRoomMutationOptions = Apollo.BaseMutationOptions<CreateRoomMutation, CreateRoomMutationVariables>;
export const DeleteRoomDocument = gql`
    mutation DeleteRoom($id: ID!) {
  deleteRoom(input: {id: $id})
}
    `;
export type DeleteRoomMutationFn = Apollo.MutationFunction<DeleteRoomMutation, DeleteRoomMutationVariables>;

/**
 * __useDeleteRoomMutation__
 *
 * To run a mutation, you first call `useDeleteRoomMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRoomMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRoomMutation, { data, loading, error }] = useDeleteRoomMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteRoomMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteRoomMutation, DeleteRoomMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteRoomMutation, DeleteRoomMutationVariables>(DeleteRoomDocument, options);
      }
export type DeleteRoomMutationHookResult = ReturnType<typeof useDeleteRoomMutation>;
export type DeleteRoomMutationResult = Apollo.MutationResult<DeleteRoomMutation>;
export type DeleteRoomMutationOptions = Apollo.BaseMutationOptions<DeleteRoomMutation, DeleteRoomMutationVariables>;
export const GetChromaCollectionDocument = gql`
    query GetChromaCollection($id: ID!) {
  chromaCollection(id: $id) {
    ...ChromaCollection
  }
}
    ${ChromaCollectionFragmentDoc}`;

/**
 * __useGetChromaCollectionQuery__
 *
 * To run a query within a React component, call `useGetChromaCollectionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetChromaCollectionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetChromaCollectionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetChromaCollectionQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetChromaCollectionQuery, GetChromaCollectionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetChromaCollectionQuery, GetChromaCollectionQueryVariables>(GetChromaCollectionDocument, options);
      }
export function useGetChromaCollectionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetChromaCollectionQuery, GetChromaCollectionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetChromaCollectionQuery, GetChromaCollectionQueryVariables>(GetChromaCollectionDocument, options);
        }
export type GetChromaCollectionQueryHookResult = ReturnType<typeof useGetChromaCollectionQuery>;
export type GetChromaCollectionLazyQueryHookResult = ReturnType<typeof useGetChromaCollectionLazyQuery>;
export type GetChromaCollectionQueryResult = Apollo.QueryResult<GetChromaCollectionQuery, GetChromaCollectionQueryVariables>;
export const SearchChromaCollectionDocument = gql`
    query SearchChromaCollection($search: String, $values: [ID!]) {
  options: chromaCollections(
    filters: {search: $search, ids: $values}
    pagination: {limit: 10}
  ) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchChromaCollectionQuery__
 *
 * To run a query within a React component, call `useSearchChromaCollectionQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchChromaCollectionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchChromaCollectionQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchChromaCollectionQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchChromaCollectionQuery, SearchChromaCollectionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchChromaCollectionQuery, SearchChromaCollectionQueryVariables>(SearchChromaCollectionDocument, options);
      }
export function useSearchChromaCollectionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchChromaCollectionQuery, SearchChromaCollectionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchChromaCollectionQuery, SearchChromaCollectionQueryVariables>(SearchChromaCollectionDocument, options);
        }
export type SearchChromaCollectionQueryHookResult = ReturnType<typeof useSearchChromaCollectionQuery>;
export type SearchChromaCollectionLazyQueryHookResult = ReturnType<typeof useSearchChromaCollectionLazyQuery>;
export type SearchChromaCollectionQueryResult = Apollo.QueryResult<SearchChromaCollectionQuery, SearchChromaCollectionQueryVariables>;
export const ListChromaCollectionsDocument = gql`
    query ListChromaCollections($filter: ChromaCollectionFilter, $pagination: OffsetPaginationInput) {
  chromaCollections(filters: $filter, pagination: $pagination) {
    ...ListChromaCollection
  }
}
    ${ListChromaCollectionFragmentDoc}`;

/**
 * __useListChromaCollectionsQuery__
 *
 * To run a query within a React component, call `useListChromaCollectionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListChromaCollectionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListChromaCollectionsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListChromaCollectionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListChromaCollectionsQuery, ListChromaCollectionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListChromaCollectionsQuery, ListChromaCollectionsQueryVariables>(ListChromaCollectionsDocument, options);
      }
export function useListChromaCollectionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListChromaCollectionsQuery, ListChromaCollectionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListChromaCollectionsQuery, ListChromaCollectionsQueryVariables>(ListChromaCollectionsDocument, options);
        }
export type ListChromaCollectionsQueryHookResult = ReturnType<typeof useListChromaCollectionsQuery>;
export type ListChromaCollectionsLazyQueryHookResult = ReturnType<typeof useListChromaCollectionsLazyQuery>;
export type ListChromaCollectionsQueryResult = Apollo.QueryResult<ListChromaCollectionsQuery, ListChromaCollectionsQueryVariables>;
export const QueryDocumentsDocument = gql`
    query QueryDocuments($input: QueryInput!) {
  documents(input: $input) {
    ...Document
  }
}
    ${DocumentFragmentDoc}`;

/**
 * __useQueryDocumentsQuery__
 *
 * To run a query within a React component, call `useQueryDocumentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useQueryDocumentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useQueryDocumentsQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useQueryDocumentsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<QueryDocumentsQuery, QueryDocumentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<QueryDocumentsQuery, QueryDocumentsQueryVariables>(QueryDocumentsDocument, options);
      }
export function useQueryDocumentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<QueryDocumentsQuery, QueryDocumentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<QueryDocumentsQuery, QueryDocumentsQueryVariables>(QueryDocumentsDocument, options);
        }
export type QueryDocumentsQueryHookResult = ReturnType<typeof useQueryDocumentsQuery>;
export type QueryDocumentsLazyQueryHookResult = ReturnType<typeof useQueryDocumentsLazyQuery>;
export type QueryDocumentsQueryResult = Apollo.QueryResult<QueryDocumentsQuery, QueryDocumentsQueryVariables>;
export const HomePageStatsDocument = gql`
    query HomePageStats {
  roomStats {
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
export const GetLlmModelDocument = gql`
    query GetLLMModel($id: ID!) {
  llmModel(id: $id) {
    ...LLMModel
  }
}
    ${LlmModelFragmentDoc}`;

/**
 * __useGetLlmModelQuery__
 *
 * To run a query within a React component, call `useGetLlmModelQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLlmModelQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLlmModelQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetLlmModelQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetLlmModelQuery, GetLlmModelQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetLlmModelQuery, GetLlmModelQueryVariables>(GetLlmModelDocument, options);
      }
export function useGetLlmModelLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetLlmModelQuery, GetLlmModelQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetLlmModelQuery, GetLlmModelQueryVariables>(GetLlmModelDocument, options);
        }
export type GetLlmModelQueryHookResult = ReturnType<typeof useGetLlmModelQuery>;
export type GetLlmModelLazyQueryHookResult = ReturnType<typeof useGetLlmModelLazyQuery>;
export type GetLlmModelQueryResult = Apollo.QueryResult<GetLlmModelQuery, GetLlmModelQueryVariables>;
export const SearchLlmModelsDocument = gql`
    query SearchLLMModels($search: String, $values: [ID!]) {
  options: llmModels(
    filters: {search: $search, ids: $values}
    pagination: {limit: 10}
  ) {
    value: id
    label: id
  }
}
    `;

/**
 * __useSearchLlmModelsQuery__
 *
 * To run a query within a React component, call `useSearchLlmModelsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchLlmModelsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchLlmModelsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchLlmModelsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchLlmModelsQuery, SearchLlmModelsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchLlmModelsQuery, SearchLlmModelsQueryVariables>(SearchLlmModelsDocument, options);
      }
export function useSearchLlmModelsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchLlmModelsQuery, SearchLlmModelsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchLlmModelsQuery, SearchLlmModelsQueryVariables>(SearchLlmModelsDocument, options);
        }
export type SearchLlmModelsQueryHookResult = ReturnType<typeof useSearchLlmModelsQuery>;
export type SearchLlmModelsLazyQueryHookResult = ReturnType<typeof useSearchLlmModelsLazyQuery>;
export type SearchLlmModelsQueryResult = Apollo.QueryResult<SearchLlmModelsQuery, SearchLlmModelsQueryVariables>;
export const ListLlModelsDocument = gql`
    query ListLLModels($filter: LLMModelFilter, $pagination: OffsetPaginationInput) {
  llmModels(filters: $filter, pagination: $pagination) {
    ...ListLLMModel
  }
}
    ${ListLlmModelFragmentDoc}`;

/**
 * __useListLlModelsQuery__
 *
 * To run a query within a React component, call `useListLlModelsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListLlModelsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListLlModelsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListLlModelsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListLlModelsQuery, ListLlModelsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListLlModelsQuery, ListLlModelsQueryVariables>(ListLlModelsDocument, options);
      }
export function useListLlModelsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListLlModelsQuery, ListLlModelsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListLlModelsQuery, ListLlModelsQueryVariables>(ListLlModelsDocument, options);
        }
export type ListLlModelsQueryHookResult = ReturnType<typeof useListLlModelsQuery>;
export type ListLlModelsLazyQueryHookResult = ReturnType<typeof useListLlModelsLazyQuery>;
export type ListLlModelsQueryResult = Apollo.QueryResult<ListLlModelsQuery, ListLlModelsQueryVariables>;
export const GetMessageDocument = gql`
    query GetMessage($id: ID!) {
  message(id: $id) {
    ...Message
    room {
      id
      title
    }
  }
}
    ${MessageFragmentDoc}`;

/**
 * __useGetMessageQuery__
 *
 * To run a query within a React component, call `useGetMessageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMessageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMessageQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetMessageQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetMessageQuery, GetMessageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMessageQuery, GetMessageQueryVariables>(GetMessageDocument, options);
      }
export function useGetMessageLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMessageQuery, GetMessageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMessageQuery, GetMessageQueryVariables>(GetMessageDocument, options);
        }
export type GetMessageQueryHookResult = ReturnType<typeof useGetMessageQuery>;
export type GetMessageLazyQueryHookResult = ReturnType<typeof useGetMessageLazyQuery>;
export type GetMessageQueryResult = Apollo.QueryResult<GetMessageQuery, GetMessageQueryVariables>;
export const GetProviderDocument = gql`
    query GetProvider($id: ID!) {
  provider(id: $id) {
    ...Provider
  }
}
    ${ProviderFragmentDoc}`;

/**
 * __useGetProviderQuery__
 *
 * To run a query within a React component, call `useGetProviderQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetProviderQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetProviderQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetProviderQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetProviderQuery, GetProviderQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetProviderQuery, GetProviderQueryVariables>(GetProviderDocument, options);
      }
export function useGetProviderLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetProviderQuery, GetProviderQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetProviderQuery, GetProviderQueryVariables>(GetProviderDocument, options);
        }
export type GetProviderQueryHookResult = ReturnType<typeof useGetProviderQuery>;
export type GetProviderLazyQueryHookResult = ReturnType<typeof useGetProviderLazyQuery>;
export type GetProviderQueryResult = Apollo.QueryResult<GetProviderQuery, GetProviderQueryVariables>;
export const SearchProvidersDocument = gql`
    query SearchProviders($search: String, $values: [ID!]) {
  options: providers(
    filters: {search: $search, ids: $values}
    pagination: {limit: 10}
  ) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchProvidersQuery__
 *
 * To run a query within a React component, call `useSearchProvidersQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchProvidersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchProvidersQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchProvidersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchProvidersQuery, SearchProvidersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchProvidersQuery, SearchProvidersQueryVariables>(SearchProvidersDocument, options);
      }
export function useSearchProvidersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchProvidersQuery, SearchProvidersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchProvidersQuery, SearchProvidersQueryVariables>(SearchProvidersDocument, options);
        }
export type SearchProvidersQueryHookResult = ReturnType<typeof useSearchProvidersQuery>;
export type SearchProvidersLazyQueryHookResult = ReturnType<typeof useSearchProvidersLazyQuery>;
export type SearchProvidersQueryResult = Apollo.QueryResult<SearchProvidersQuery, SearchProvidersQueryVariables>;
export const ListProvidersDocument = gql`
    query ListProviders($filter: ProviderFilter, $pagination: OffsetPaginationInput) {
  providers(filters: $filter, pagination: $pagination) {
    ...ListProvider
  }
}
    ${ListProviderFragmentDoc}`;

/**
 * __useListProvidersQuery__
 *
 * To run a query within a React component, call `useListProvidersQuery` and pass it any options that fit your needs.
 * When your component renders, `useListProvidersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListProvidersQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListProvidersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListProvidersQuery, ListProvidersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListProvidersQuery, ListProvidersQueryVariables>(ListProvidersDocument, options);
      }
export function useListProvidersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListProvidersQuery, ListProvidersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListProvidersQuery, ListProvidersQueryVariables>(ListProvidersDocument, options);
        }
export type ListProvidersQueryHookResult = ReturnType<typeof useListProvidersQuery>;
export type ListProvidersLazyQueryHookResult = ReturnType<typeof useListProvidersLazyQuery>;
export type ListProvidersQueryResult = Apollo.QueryResult<ListProvidersQuery, ListProvidersQueryVariables>;
export const GetRoomDocument = gql`
    query GetRoom($id: ID!) {
  room(id: $id) {
    ...Room
  }
}
    ${RoomFragmentDoc}`;

/**
 * __useGetRoomQuery__
 *
 * To run a query within a React component, call `useGetRoomQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRoomQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRoomQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetRoomQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetRoomQuery, GetRoomQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetRoomQuery, GetRoomQueryVariables>(GetRoomDocument, options);
      }
export function useGetRoomLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetRoomQuery, GetRoomQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetRoomQuery, GetRoomQueryVariables>(GetRoomDocument, options);
        }
export type GetRoomQueryHookResult = ReturnType<typeof useGetRoomQuery>;
export type GetRoomLazyQueryHookResult = ReturnType<typeof useGetRoomLazyQuery>;
export type GetRoomQueryResult = Apollo.QueryResult<GetRoomQuery, GetRoomQueryVariables>;
export const SearchRoomsDocument = gql`
    query SearchRooms($search: String, $values: [ID!]) {
  options: rooms(
    filters: {search: $search, ids: $values}
    pagination: {limit: 10}
  ) {
    value: id
    label: title
    description: description
  }
}
    `;

/**
 * __useSearchRoomsQuery__
 *
 * To run a query within a React component, call `useSearchRoomsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchRoomsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchRoomsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchRoomsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchRoomsQuery, SearchRoomsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchRoomsQuery, SearchRoomsQueryVariables>(SearchRoomsDocument, options);
      }
export function useSearchRoomsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchRoomsQuery, SearchRoomsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchRoomsQuery, SearchRoomsQueryVariables>(SearchRoomsDocument, options);
        }
export type SearchRoomsQueryHookResult = ReturnType<typeof useSearchRoomsQuery>;
export type SearchRoomsLazyQueryHookResult = ReturnType<typeof useSearchRoomsLazyQuery>;
export type SearchRoomsQueryResult = Apollo.QueryResult<SearchRoomsQuery, SearchRoomsQueryVariables>;
export const ListRoomsDocument = gql`
    query ListRooms($filter: RoomFilter, $pagination: OffsetPaginationInput) {
  rooms(filters: $filter, pagination: $pagination) {
    ...Room
  }
}
    ${RoomFragmentDoc}`;

/**
 * __useListRoomsQuery__
 *
 * To run a query within a React component, call `useListRoomsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListRoomsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListRoomsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListRoomsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListRoomsQuery, ListRoomsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListRoomsQuery, ListRoomsQueryVariables>(ListRoomsDocument, options);
      }
export function useListRoomsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListRoomsQuery, ListRoomsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListRoomsQuery, ListRoomsQueryVariables>(ListRoomsDocument, options);
        }
export type ListRoomsQueryHookResult = ReturnType<typeof useListRoomsQuery>;
export type ListRoomsLazyQueryHookResult = ReturnType<typeof useListRoomsLazyQuery>;
export type ListRoomsQueryResult = Apollo.QueryResult<ListRoomsQuery, ListRoomsQueryVariables>;
export const RoomsDocument = gql`
    query Rooms {
  rooms(pagination: {limit: 10}) {
    id
    title
    description
    messages(pagination: {limit: 4}) {
      ...ListMessage
    }
  }
}
    ${ListMessageFragmentDoc}`;

/**
 * __useRoomsQuery__
 *
 * To run a query within a React component, call `useRoomsQuery` and pass it any options that fit your needs.
 * When your component renders, `useRoomsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoomsQuery({
 *   variables: {
 *   },
 * });
 */
export function useRoomsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<RoomsQuery, RoomsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RoomsQuery, RoomsQueryVariables>(RoomsDocument, options);
      }
export function useRoomsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RoomsQuery, RoomsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RoomsQuery, RoomsQueryVariables>(RoomsDocument, options);
        }
export type RoomsQueryHookResult = ReturnType<typeof useRoomsQuery>;
export type RoomsLazyQueryHookResult = ReturnType<typeof useRoomsLazyQuery>;
export type RoomsQueryResult = Apollo.QueryResult<RoomsQuery, RoomsQueryVariables>;
export const RecentRoomsDocument = gql`
    query RecentRooms($filter: RoomFilter, $pagination: OffsetPaginationInput) {
  rooms(filters: $filter, pagination: $pagination, ordering: [{createdAt: DESC}]) {
    ...RecentRoom
  }
}
    ${RecentRoomFragmentDoc}`;

/**
 * __useRecentRoomsQuery__
 *
 * To run a query within a React component, call `useRecentRoomsQuery` and pass it any options that fit your needs.
 * When your component renders, `useRecentRoomsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRecentRoomsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useRecentRoomsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<RecentRoomsQuery, RecentRoomsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RecentRoomsQuery, RecentRoomsQueryVariables>(RecentRoomsDocument, options);
      }
export function useRecentRoomsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RecentRoomsQuery, RecentRoomsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RecentRoomsQuery, RecentRoomsQueryVariables>(RecentRoomsDocument, options);
        }
export type RecentRoomsQueryHookResult = ReturnType<typeof useRecentRoomsQuery>;
export type RecentRoomsLazyQueryHookResult = ReturnType<typeof useRecentRoomsLazyQuery>;
export type RecentRoomsQueryResult = Apollo.QueryResult<RecentRoomsQuery, RecentRoomsQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String, $noRooms: Boolean!, $pagination: OffsetPaginationInput) {
  rooms: rooms(filters: {search: $search}, pagination: $pagination) @skip(if: $noRooms) {
    ...ListRoom
  }
}
    ${ListRoomFragmentDoc}`;

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
 *      noRooms: // value for 'noRooms'
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
export const WatchMessagesDocument = gql`
    subscription WatchMessages($room: ID!, $agentId: ID!) {
  room(room: $room, agentId: $agentId, filterOwn: false) {
    message {
      ...ListMessage
    }
  }
}
    ${ListMessageFragmentDoc}`;

/**
 * __useWatchMessagesSubscription__
 *
 * To run a query within a React component, call `useWatchMessagesSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchMessagesSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchMessagesSubscription({
 *   variables: {
 *      room: // value for 'room'
 *      agentId: // value for 'agentId'
 *   },
 * });
 */
export function useWatchMessagesSubscription(baseOptions: ApolloReactHooks.SubscriptionHookOptions<WatchMessagesSubscription, WatchMessagesSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<WatchMessagesSubscription, WatchMessagesSubscriptionVariables>(WatchMessagesDocument, options);
      }
export type WatchMessagesSubscriptionHookResult = ReturnType<typeof useWatchMessagesSubscription>;
export type WatchMessagesSubscriptionResult = Apollo.SubscriptionResult<WatchMessagesSubscription>;