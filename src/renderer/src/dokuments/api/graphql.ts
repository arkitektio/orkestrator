import { gql } from '@/core/connection/graphql/lazyGql';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/dokuments/api/funcs';
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
  /** A number of bytes. 64-bit, unlike Int: serialized as a JSON number, and accepted as a number or a numeric string. */
  ByteCount: { input: number; output: number; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /** The `FileLike` scalar type represents a reference to a big file storage previously created by the user n a datalayer */
  FileLike: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

/** Objects to put in a collaboration at once: all of them, or none */
export type AddManyToCollaborationInput = {
  /** The collaboration's key (lok's) */
  collaboration: Scalars['ID']['input'];
  /** The collaboration's name, kept here when these are the first things put in */
  name?: InputMaybe<Scalars['String']['input']>;
  /** What to put in; a whole before its parts */
  objects: Array<CollaborationObjectRef>;
};

/** What a guest granted it sees of the organization: the objects put in it, and what is part of them. */
export type Collaboration = {
  __typename?: 'Collaboration';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** How many objects are in the collaboration: all of them, or (`brought`) only those put in by hand (false) or only those that came along with one (true) */
  itemCount: Scalars['Int']['output'];
  /** What is in the collaboration, oldest first; what is part of these is in it too. `brought` keeps what was put in by hand (false) or only what came along with it (true) */
  items: Array<CollaborationItem>;
  /** The collaboration's key across the hub: what lok grants, and what names it in every service */
  key: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};


/** What a guest granted it sees of the organization: the objects put in it, and what is part of them. */
export type CollaborationItemCountArgs = {
  brought?: InputMaybe<Scalars['Boolean']['input']>;
};


/** What a guest granted it sees of the organization: the objects put in it, and what is part of them. */
export type CollaborationItemsArgs = {
  brought?: InputMaybe<Scalars['Boolean']['input']>;
  pagination?: InputMaybe<OffsetPaginationInput>;
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
  /** The collaboration's key (lok's) */
  collaboration: Scalars['ID']['input'];
  /** The structure the object is known by: @mikro/scene */
  identifier: Scalars['String']['input'];
  /** The collaboration's name, kept here when this is the first thing put in */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The object's id */
  object: Scalars['ID']['input'];
};

/** An object, by its structure and id */
export type CollaborationObjectRef = {
  /** The structure the object is known by: @mikro/scene */
  identifier: Scalars['String']['input'];
  /** The object's id */
  object: Scalars['ID']['input'];
};

/** How many collaborations the organization has (a guest: theirs), and how much is in them */
export type CollaborationStats = {
  __typename?: 'CollaborationStats';
  /** How many collaborations */
  count: Scalars['Int']['output'];
  /** How many objects are in them altogether, brought along ones included */
  itemCount: Scalars['Int']['output'];
};

export type CreateDocumentInput = {
  file?: InputMaybe<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
};

export type CreatePageInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  document: Scalars['ID']['input'];
  image: Scalars['FileLike']['input'];
  index: Scalars['Int']['input'];
  ocrResult: OcrPageResultInput;
};

export type DeleteFileInput = {
  id: Scalars['ID']['input'];
};

export type Document = {
  __typename?: 'Document';
  file: File;
  id: Scalars['ID']['output'];
  /** How many pages the document has. */
  pageCount: Scalars['Int']['output'];
  /** The document's pages, in reading order (by index). */
  pages: Array<Page>;
  processedAt?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};


export type DocumentPagesArgs = {
  filters?: InputMaybe<PageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type DocumentFilter = {
  AND?: InputMaybe<DocumentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DocumentFilter>;
  OR?: InputMaybe<DocumentFilter>;
  /** Only what the workflow (its root task id) created */
  createdUnder?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only what is in this collaboration (its key): put in, or part of what was */
  inCollaboration?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type File = {
  __typename?: 'File';
  /** The documents that reference this file */
  documents: Array<Document>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  store?: Maybe<MediaStore>;
};


export type FileDocumentsArgs = {
  filters?: InputMaybe<DocumentFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type FileEvent = {
  __typename?: 'FileEvent';
  create?: Maybe<File>;
  delete?: Maybe<Scalars['ID']['output']>;
  moved?: Maybe<File>;
  update?: Maybe<File>;
};

export type FileFilter = {
  AND?: InputMaybe<FileFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<FileFilter>;
  OR?: InputMaybe<FileFilter>;
  /** Only what the workflow (its root task id) created */
  createdUnder?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only what is in this collaboration (its key): put in, or part of what was */
  inCollaboration?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type FinishMediaUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

export type FromFileLike = {
  dataset?: InputMaybe<Scalars['ID']['input']>;
  file: Scalars['FileLike']['input'];
  origins?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Temporary S3 credentials for reading a media object. */
export type GeneralMediaAccessGrant = {
  __typename?: 'GeneralMediaAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  prefix: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

/** Temporary S3 credentials for reading a media object. */
export type MediaAccessGrant = {
  __typename?: 'MediaAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

export type MediaStore = {
  __typename?: 'MediaStore';
  /** Get temporary S3 read credentials for the media object. */
  accessGrant: MediaAccessGrant;
  bucket: Scalars['String']['output'];
  contentType?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  /** The byte budget the upload grant advertised for this store. Advertised, not enforced: a session policy bounds what a credential may write, never how much, so a store may exceed this */
  maxBytes?: Maybe<Scalars['ByteCount']['output']>;
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  /** How many bytes this store actually holds, measured when its upload was finished. Null while unfinished, or for stores written before this was recorded */
  sizeBytes?: Maybe<Scalars['ByteCount']['output']>;
};

/** Temporary S3 credentials for uploading a media object. */
export type MediaUploadGrant = {
  __typename?: 'MediaUploadGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  maxBytes: Scalars['ByteCount']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store: Scalars['String']['output'];
  uploadContentType?: Maybe<Scalars['String']['output']>;
  uploadFileName: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Put several files in a collaboration (by its key) at once, each with what it needs to be seen: all of them, or none */
  addManyToCollaboration: Collaboration;
  /** Put a file in a collaboration (lok's, by its key), with its bytes and its pages' images: its documents and their pages are in it with it. The collaboration's row here is made the first time something is put in */
  addToCollaboration: Collaboration;
  /** Create a new document */
  createDocument: Document;
  /** Create a new page in a document */
  createPage: Page;
  /** Take everything dokuments put in a collaboration (by its key) out of it: whoever was granted it sees nothing of it here any more. lok's collaboration, and its grants, stay */
  deleteCollaboration: Scalars['ID']['output'];
  /** Delete an existing file */
  deleteFile: Scalars['ID']['output'];
  /** Finalize an upload after the client has written the object. */
  finishMediaUpload: MediaStore;
  /** Create a file from file-like data */
  fromFileLike: File;
  /** Reissue upload credentials for a media upload still in flight, to the same key, so a write that outlives its credentials carries on. Only the uploader may, never for a finished store, and never past the upload's time limit */
  refreshMediaUpload: MediaUploadGrant;
  /** Take a file out of a collaboration, with what it brought that nothing else there needs */
  removeFromCollaboration: Collaboration;
  /** Request temporary S3 read credentials for the organization's files. */
  requestGeneralMediaAccess: GeneralMediaAccessGrant;
  /** Request temporary S3 read credentials for an uploaded file (a file's bytes, or a page's image). A guest of the organization gets them only for what is in one of their collaborations. */
  requestMediaAccess: MediaAccessGrant;
  /** Request temporary S3 credentials to upload one file (a document, or a page's image). */
  requestMediaUpload: MediaUploadGrant;
  /** Put what a workflow (its root task) created in dokuments in a collaboration, as it is now: what it makes later is not. A document or page made in the workflow for a file made before it, and not shared, is left out and reported; `dryRun` only says what would be put in */
  shareWorkflow: WorkflowShare;
};


export type MutationAddManyToCollaborationArgs = {
  input: AddManyToCollaborationInput;
};


export type MutationAddToCollaborationArgs = {
  input: CollaborationObjectInput;
};


export type MutationCreateDocumentArgs = {
  input: CreateDocumentInput;
};


export type MutationCreatePageArgs = {
  input: CreatePageInput;
};


export type MutationDeleteCollaborationArgs = {
  key: Scalars['ID']['input'];
};


export type MutationDeleteFileArgs = {
  input: DeleteFileInput;
};


export type MutationFinishMediaUploadArgs = {
  input: FinishMediaUploadInput;
};


export type MutationFromFileLikeArgs = {
  input: FromFileLike;
};


export type MutationRefreshMediaUploadArgs = {
  input: RefreshUploadInput;
};


export type MutationRemoveFromCollaborationArgs = {
  input: CollaborationObjectInput;
};


export type MutationRequestGeneralMediaAccessArgs = {
  input: RequestGeneralMediaAccessInput;
};


export type MutationRequestMediaAccessArgs = {
  input: RequestMediaAccessInput;
};


export type MutationRequestMediaUploadArgs = {
  input: RequestMediaUploadInput;
};


export type MutationShareWorkflowArgs = {
  input: ShareWorkflowInput;
};

export type OcrPageResult = {
  __typename?: 'OCRPageResult';
  angle: Scalars['Float']['output'];
  lines: Array<OcrTextLine>;
};

export type OcrPageResultInput = {
  /** Estimated rotation angle of the page */
  angle: Scalars['Float']['input'];
  lines: Array<OcrTextLineInput>;
};

export type OcrTextLine = {
  __typename?: 'OCRTextLine';
  angle: Scalars['Float']['output'];
  bbox: Array<Array<Scalars['Int']['output']>>;
  score: Scalars['Float']['output'];
  text: Scalars['String']['output'];
};

export type OcrTextLineInput = {
  angle: Scalars['Float']['input'];
  bbox: Array<Array<Scalars['Int']['input']>>;
  score: Scalars['Float']['input'];
  text: Scalars['String']['input'];
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

export type Page = {
  __typename?: 'Page';
  /** The content of the page as a flat string. Null when no text was recognised on it. */
  content?: Maybe<Scalars['String']['output']>;
  document: Document;
  id: Scalars['ID']['output'];
  image: MediaStore;
  index: Scalars['Int']['output'];
  ocrResult?: Maybe<OcrPageResult>;
};

export type PageFilter = {
  AND?: InputMaybe<PageFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<PageFilter>;
  OR?: InputMaybe<PageFilter>;
  /** Only what the workflow (its root task id) created */
  createdUnder?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only what is in this collaboration (its key): put in, or part of what was */
  inCollaboration?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Get a single collaboration by its key (lok's): what was put in it here */
  collaboration: Collaboration;
  /** List the organization's collaborations that hold something of dokuments (a guest: the collaborations granted to them) */
  collaborations: Array<Collaboration>;
  /** Count the collaborations `collaborations` lists, and the objects in them */
  collaborationsStats: CollaborationStats;
  document: Document;
  documents: Array<Document>;
  file: File;
  files: Array<File>;
  page: Page;
  pages: Array<Page>;
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryCollaborationArgs = {
  key: Scalars['ID']['input'];
};


export type QueryCollaborationsArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDocumentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDocumentsArgs = {
  filters?: InputMaybe<DocumentFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryFileArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFilesArgs = {
  filters?: InputMaybe<FileFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPagesArgs = {
  filters?: InputMaybe<PageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type RefreshUploadInput = {
  storeId: Scalars['String']['input'];
};

export type RequestGeneralMediaAccessInput = {
  expiresIn?: InputMaybe<Scalars['Int']['input']>;
};

export type RequestMediaAccessInput = {
  storeId: Scalars['String']['input'];
};

export type RequestMediaUploadInput = {
  contentType?: InputMaybe<Scalars['String']['input']>;
  fileSize: Scalars['ByteCount']['input'];
  originalFileName: Scalars['String']['input'];
};

/** Put what a workflow created in a collaboration, as it is now */
export type ShareWorkflowInput = {
  /** The collaboration's key (lok's) */
  collaboration: Scalars['ID']['input'];
  /** Only say what would be put in, and what left out */
  dryRun?: Scalars['Boolean']['input'];
  /** The collaboration's name, kept here when this puts the first things in */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The workflow: the id of the task a person started, the root of every task it caused */
  rootTask: Scalars['ID']['input'];
};

/** An object, by its structure and id */
export type SharedObject = {
  __typename?: 'SharedObject';
  /** The structure the object is known by: @mikro/scene */
  identifier?: Maybe<Scalars['String']['output']>;
  /** The object's id */
  object: Scalars['ID']['output'];
};

/** Created in the workflow, but part of something made before it that is not shared: left out */
export type SkippedObject = {
  __typename?: 'SkippedObject';
  /** The structure the object is known by */
  identifier?: Maybe<Scalars['String']['output']>;
  /** The object's id */
  object: Scalars['ID']['output'];
  /** The id of what it is part of: put that in, and share the workflow again, to bring it */
  whole: Scalars['ID']['output'];
  /** The structure of what it is part of */
  wholeIdentifier?: Maybe<Scalars['String']['output']>;
};

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
  /** Subscribe to real-time file updates */
  files: FileEvent;
};


export type SubscriptionFilesArgs = {
  dataset?: InputMaybe<Scalars['ID']['input']>;
};

/** What sharing a workflow put in a collaboration here (or, tried, would put in) */
export type WorkflowShare = {
  __typename?: 'WorkflowShare';
  /** Put in, with what each needs to be seen */
  added: Array<SharedObject>;
  /** The collaboration's key */
  collaboration: Scalars['ID']['output'];
  /** How many parts came along with their whole, without being put in themselves */
  covered: Scalars['Int']['output'];
  /** Whether nothing was written */
  dryRun: Scalars['Boolean']['output'];
  /** Left out: parts of something made before the workflow and not shared */
  skipped: Array<SkippedObject>;
  /** Structures here that cannot say what created their objects: not looked at */
  unknown: Array<Scalars['String']['output']>;
};

export type _Entity = MediaStore;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type DocumentFragment = { __typename?: 'Document', id: string, title: string, pages: Array<(
    { __typename?: 'Page' }
    & ListPageFragment
  )> };

export type ListDocumentFragment = { __typename?: 'Document', id: string, title: string };

export type FileFragment = { __typename?: 'File', id: string, name: string, documents: Array<(
    { __typename?: 'Document' }
    & ListDocumentFragment
  )>, store?: (
    { __typename?: 'MediaStore' }
    & MediaStoreFragment
  ) | null };

export type ListFileFragment = { __typename?: 'File', id: string, name: string };

export type OcrPageResultFragment = { __typename?: 'OCRPageResult', angle: number, lines: Array<{ __typename?: 'OCRTextLine', text: string, score: number, angle: number, bbox: Array<Array<number>> }> };

export type PageFragment = { __typename?: 'Page', id: string, index: number, content?: string | null, image: (
    { __typename?: 'MediaStore' }
    & MediaStoreFragment
  ), ocrResult?: (
    { __typename?: 'OCRPageResult' }
    & OcrPageResultFragment
  ) | null };

export type ListPageFragment = { __typename?: 'Page', id: string, index: number, image: (
    { __typename?: 'MediaStore' }
    & MediaStoreFragment
  ) };

export type MediaStoreFragment = { __typename?: 'MediaStore', id: string, key: string, bucket: string, path: string, originalFileName?: string | null, sizeBytes?: number | null };

export type GeneralMediaAccessGrantFragment = { __typename?: 'GeneralMediaAccessGrant', accessKey: string, secretKey: string, sessionToken: string, expiresIn: number, region: string, bucket: string, prefix: string };

export type RequestGeneralMediaAccessMutationVariables = Exact<{
  input: RequestGeneralMediaAccessInput;
}>;


export type RequestGeneralMediaAccessMutation = { __typename?: 'Mutation', requestGeneralMediaAccess: (
    { __typename?: 'GeneralMediaAccessGrant' }
    & GeneralMediaAccessGrantFragment
  ) };

export type ShareWorkflowMutationVariables = Exact<{
  input: ShareWorkflowInput;
}>;


export type ShareWorkflowMutation = { __typename?: 'Mutation', shareWorkflow: { __typename?: 'WorkflowShare', collaboration: string, dryRun: boolean, covered: number, unknown: Array<string>, added: Array<{ __typename?: 'SharedObject', identifier?: string | null, object: string }>, skipped: Array<{ __typename?: 'SkippedObject', identifier?: string | null, object: string, wholeIdentifier?: string | null, whole: string }> } };

export type GetDocumentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDocumentQuery = { __typename?: 'Query', document: (
    { __typename?: 'Document' }
    & DocumentFragment
  ) };

export type DocumentDisplayQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DocumentDisplayQuery = { __typename?: 'Query', document: { __typename?: 'Document', id: string, title: string, pageCount: number } };

export type ListDocumentsQueryVariables = Exact<{
  filter?: InputMaybe<DocumentFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListDocumentsQuery = { __typename?: 'Query', documents: Array<(
    { __typename?: 'Document' }
    & ListDocumentFragment
  )> };

export type GetFileQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetFileQuery = { __typename?: 'Query', file: (
    { __typename?: 'File' }
    & FileFragment
  ) };

export type ListFilesQueryVariables = Exact<{
  filter?: InputMaybe<FileFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListFilesQuery = { __typename?: 'Query', files: Array<(
    { __typename?: 'File' }
    & ListFileFragment
  )> };

export type GetPageQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetPageQuery = { __typename?: 'Query', page: (
    { __typename?: 'Page' }
    & PageFragment
  ) };

export type PageDisplayQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PageDisplayQuery = { __typename?: 'Query', page: { __typename?: 'Page', id: string, index: number, content?: string | null } };

export const MediaStoreFragmentDoc = gql`
    fragment MediaStore on MediaStore {
  id
  key
  bucket
  path
  originalFileName
  sizeBytes
}
    `;
export const ListPageFragmentDoc = gql`
    fragment ListPage on Page {
  id
  index
  image {
    ...MediaStore
  }
}
    ${MediaStoreFragmentDoc}`;
export const DocumentFragmentDoc = gql`
    fragment Document on Document {
  id
  title
  pages {
    ...ListPage
  }
}
    ${ListPageFragmentDoc}`;
export const ListDocumentFragmentDoc = gql`
    fragment ListDocument on Document {
  id
  title
}
    `;
export const FileFragmentDoc = gql`
    fragment File on File {
  id
  name
  documents {
    ...ListDocument
  }
  store {
    ...MediaStore
  }
}
    ${ListDocumentFragmentDoc}
${MediaStoreFragmentDoc}`;
export const ListFileFragmentDoc = gql`
    fragment ListFile on File {
  id
  name
}
    `;
export const OcrPageResultFragmentDoc = gql`
    fragment OCRPageResult on OCRPageResult {
  lines {
    text
    score
    angle
    bbox
  }
  angle
}
    `;
export const PageFragmentDoc = gql`
    fragment Page on Page {
  id
  index
  content
  image {
    ...MediaStore
  }
  ocrResult {
    ...OCRPageResult
  }
}
    ${MediaStoreFragmentDoc}
${OcrPageResultFragmentDoc}`;
export const GeneralMediaAccessGrantFragmentDoc = gql`
    fragment GeneralMediaAccessGrant on GeneralMediaAccessGrant {
  accessKey
  secretKey
  sessionToken
  expiresIn
  region
  bucket
  prefix
}
    `;
export const RequestGeneralMediaAccessDocument = gql`
    mutation RequestGeneralMediaAccess($input: RequestGeneralMediaAccessInput!) {
  requestGeneralMediaAccess(input: $input) {
    ...GeneralMediaAccessGrant
  }
}
    ${GeneralMediaAccessGrantFragmentDoc}`;
export type RequestGeneralMediaAccessMutationFn = Apollo.MutationFunction<RequestGeneralMediaAccessMutation, RequestGeneralMediaAccessMutationVariables>;

/**
 * __useRequestGeneralMediaAccessMutation__
 *
 * To run a mutation, you first call `useRequestGeneralMediaAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestGeneralMediaAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestGeneralMediaAccessMutation, { data, loading, error }] = useRequestGeneralMediaAccessMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestGeneralMediaAccessMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestGeneralMediaAccessMutation, RequestGeneralMediaAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestGeneralMediaAccessMutation, RequestGeneralMediaAccessMutationVariables>(RequestGeneralMediaAccessDocument, options);
      }
export type RequestGeneralMediaAccessMutationHookResult = ReturnType<typeof useRequestGeneralMediaAccessMutation>;
export type RequestGeneralMediaAccessMutationResult = Apollo.MutationResult<RequestGeneralMediaAccessMutation>;
export type RequestGeneralMediaAccessMutationOptions = Apollo.BaseMutationOptions<RequestGeneralMediaAccessMutation, RequestGeneralMediaAccessMutationVariables>;
export const ShareWorkflowDocument = gql`
    mutation ShareWorkflow($input: ShareWorkflowInput!) {
  shareWorkflow(input: $input) {
    collaboration
    dryRun
    added {
      identifier
      object
    }
    covered
    skipped {
      identifier
      object
      wholeIdentifier
      whole
    }
    unknown
  }
}
    `;
export type ShareWorkflowMutationFn = Apollo.MutationFunction<ShareWorkflowMutation, ShareWorkflowMutationVariables>;

/**
 * __useShareWorkflowMutation__
 *
 * To run a mutation, you first call `useShareWorkflowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useShareWorkflowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [shareWorkflowMutation, { data, loading, error }] = useShareWorkflowMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useShareWorkflowMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ShareWorkflowMutation, ShareWorkflowMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ShareWorkflowMutation, ShareWorkflowMutationVariables>(ShareWorkflowDocument, options);
      }
export type ShareWorkflowMutationHookResult = ReturnType<typeof useShareWorkflowMutation>;
export type ShareWorkflowMutationResult = Apollo.MutationResult<ShareWorkflowMutation>;
export type ShareWorkflowMutationOptions = Apollo.BaseMutationOptions<ShareWorkflowMutation, ShareWorkflowMutationVariables>;
export const GetDocumentDocument = gql`
    query GetDocument($id: ID!) {
  document(id: $id) {
    ...Document
  }
}
    ${DocumentFragmentDoc}`;

/**
 * __useGetDocumentQuery__
 *
 * To run a query within a React component, call `useGetDocumentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDocumentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDocumentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetDocumentQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetDocumentQuery, GetDocumentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetDocumentQuery, GetDocumentQueryVariables>(GetDocumentDocument, options);
      }
export function useGetDocumentLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDocumentQuery, GetDocumentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetDocumentQuery, GetDocumentQueryVariables>(GetDocumentDocument, options);
        }
export type GetDocumentQueryHookResult = ReturnType<typeof useGetDocumentQuery>;
export type GetDocumentLazyQueryHookResult = ReturnType<typeof useGetDocumentLazyQuery>;
export type GetDocumentQueryResult = Apollo.QueryResult<GetDocumentQuery, GetDocumentQueryVariables>;
export const DocumentDisplayDocument = gql`
    query DocumentDisplay($id: ID!) {
  document(id: $id) {
    id
    title
    pageCount
  }
}
    `;

/**
 * __useDocumentDisplayQuery__
 *
 * To run a query within a React component, call `useDocumentDisplayQuery` and pass it any options that fit your needs.
 * When your component renders, `useDocumentDisplayQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDocumentDisplayQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDocumentDisplayQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DocumentDisplayQuery, DocumentDisplayQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DocumentDisplayQuery, DocumentDisplayQueryVariables>(DocumentDisplayDocument, options);
      }
export function useDocumentDisplayLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DocumentDisplayQuery, DocumentDisplayQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DocumentDisplayQuery, DocumentDisplayQueryVariables>(DocumentDisplayDocument, options);
        }
export type DocumentDisplayQueryHookResult = ReturnType<typeof useDocumentDisplayQuery>;
export type DocumentDisplayLazyQueryHookResult = ReturnType<typeof useDocumentDisplayLazyQuery>;
export type DocumentDisplayQueryResult = Apollo.QueryResult<DocumentDisplayQuery, DocumentDisplayQueryVariables>;
export const ListDocumentsDocument = gql`
    query ListDocuments($filter: DocumentFilter, $pagination: OffsetPaginationInput) {
  documents(filters: $filter, pagination: $pagination) {
    ...ListDocument
  }
}
    ${ListDocumentFragmentDoc}`;

/**
 * __useListDocumentsQuery__
 *
 * To run a query within a React component, call `useListDocumentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListDocumentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListDocumentsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListDocumentsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListDocumentsQuery, ListDocumentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListDocumentsQuery, ListDocumentsQueryVariables>(ListDocumentsDocument, options);
      }
export function useListDocumentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListDocumentsQuery, ListDocumentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListDocumentsQuery, ListDocumentsQueryVariables>(ListDocumentsDocument, options);
        }
export type ListDocumentsQueryHookResult = ReturnType<typeof useListDocumentsQuery>;
export type ListDocumentsLazyQueryHookResult = ReturnType<typeof useListDocumentsLazyQuery>;
export type ListDocumentsQueryResult = Apollo.QueryResult<ListDocumentsQuery, ListDocumentsQueryVariables>;
export const GetFileDocument = gql`
    query GetFile($id: ID!) {
  file(id: $id) {
    ...File
  }
}
    ${FileFragmentDoc}`;

/**
 * __useGetFileQuery__
 *
 * To run a query within a React component, call `useGetFileQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFileQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetFileQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetFileQuery, GetFileQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetFileQuery, GetFileQueryVariables>(GetFileDocument, options);
      }
export function useGetFileLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetFileQuery, GetFileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetFileQuery, GetFileQueryVariables>(GetFileDocument, options);
        }
export type GetFileQueryHookResult = ReturnType<typeof useGetFileQuery>;
export type GetFileLazyQueryHookResult = ReturnType<typeof useGetFileLazyQuery>;
export type GetFileQueryResult = Apollo.QueryResult<GetFileQuery, GetFileQueryVariables>;
export const ListFilesDocument = gql`
    query ListFiles($filter: FileFilter, $pagination: OffsetPaginationInput) {
  files(filters: $filter, pagination: $pagination) {
    ...ListFile
  }
}
    ${ListFileFragmentDoc}`;

/**
 * __useListFilesQuery__
 *
 * To run a query within a React component, call `useListFilesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListFilesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListFilesQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListFilesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListFilesQuery, ListFilesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListFilesQuery, ListFilesQueryVariables>(ListFilesDocument, options);
      }
export function useListFilesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListFilesQuery, ListFilesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListFilesQuery, ListFilesQueryVariables>(ListFilesDocument, options);
        }
export type ListFilesQueryHookResult = ReturnType<typeof useListFilesQuery>;
export type ListFilesLazyQueryHookResult = ReturnType<typeof useListFilesLazyQuery>;
export type ListFilesQueryResult = Apollo.QueryResult<ListFilesQuery, ListFilesQueryVariables>;
export const GetPageDocument = gql`
    query GetPage($id: ID!) {
  page(id: $id) {
    ...Page
  }
}
    ${PageFragmentDoc}`;

/**
 * __useGetPageQuery__
 *
 * To run a query within a React component, call `useGetPageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPageQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetPageQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetPageQuery, GetPageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetPageQuery, GetPageQueryVariables>(GetPageDocument, options);
      }
export function useGetPageLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetPageQuery, GetPageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetPageQuery, GetPageQueryVariables>(GetPageDocument, options);
        }
export type GetPageQueryHookResult = ReturnType<typeof useGetPageQuery>;
export type GetPageLazyQueryHookResult = ReturnType<typeof useGetPageLazyQuery>;
export type GetPageQueryResult = Apollo.QueryResult<GetPageQuery, GetPageQueryVariables>;
export const PageDisplayDocument = gql`
    query PageDisplay($id: ID!) {
  page(id: $id) {
    id
    index
    content
  }
}
    `;

/**
 * __usePageDisplayQuery__
 *
 * To run a query within a React component, call `usePageDisplayQuery` and pass it any options that fit your needs.
 * When your component renders, `usePageDisplayQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePageDisplayQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePageDisplayQuery(baseOptions: ApolloReactHooks.QueryHookOptions<PageDisplayQuery, PageDisplayQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PageDisplayQuery, PageDisplayQueryVariables>(PageDisplayDocument, options);
      }
export function usePageDisplayLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PageDisplayQuery, PageDisplayQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PageDisplayQuery, PageDisplayQueryVariables>(PageDisplayDocument, options);
        }
export type PageDisplayQueryHookResult = ReturnType<typeof usePageDisplayQuery>;
export type PageDisplayLazyQueryHookResult = ReturnType<typeof usePageDisplayLazyQuery>;
export type PageDisplayQueryResult = Apollo.QueryResult<PageDisplayQuery, PageDisplayQueryVariables>;