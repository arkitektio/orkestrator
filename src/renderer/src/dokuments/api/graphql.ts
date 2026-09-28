import * as ApolloReactHooks from '@/dokuments/api/funcs';
import * as Apollo from '@apollo/client';
import { gql } from '@apollo/client';
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never
}
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never }
const defaultOptions = {} as const
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  FileLike: { input: any; output: any }
}

/** Temporary Credentials for a file download that can be used by a Client (e.g. in a python datalayer) */
export type AccessCredentials = {
  __typename?: 'AccessCredentials'
  accessKey: Scalars['String']['output']
  bucket: Scalars['String']['output']
  key: Scalars['String']['output']
  path: Scalars['String']['output']
  secretKey: Scalars['String']['output']
  sessionToken: Scalars['String']['output']
}

export type BigFileStore = {
  __typename?: 'BigFileStore'
  bucket: Scalars['String']['output']
  id: Scalars['ID']['output']
  key: Scalars['String']['output']
  path: Scalars['String']['output']
  presignedUrl: Scalars['String']['output']
}

export type CreateDocumentInput = {
  file?: InputMaybe<Scalars['ID']['input']>
  title: Scalars['String']['input']
}

export type CreatePageInput = {
  content?: InputMaybe<Scalars['String']['input']>
  document: Scalars['ID']['input']
  image: Scalars['FileLike']['input']
  index: Scalars['Int']['input']
  ocrResult: OcrPageResultInput
}

/** Temporary Credentials for a file upload that can be used by a Client (e.g. in a python datalayer) */
export type Credentials = {
  __typename?: 'Credentials'
  accessKey: Scalars['String']['output']
  bucket: Scalars['String']['output']
  datalayer: Scalars['String']['output']
  key: Scalars['String']['output']
  secretKey: Scalars['String']['output']
  sessionToken: Scalars['String']['output']
  status: Scalars['String']['output']
  store: Scalars['String']['output']
}

export type DeleteFileInput = {
  id: Scalars['ID']['input']
}

export type Document = {
  __typename?: 'Document'
  file: File
  id: Scalars['ID']['output']
  ocrEngine: Scalars['String']['output']
  pageCount?: Maybe<Scalars['Int']['output']>
  pages: Array<Page>
  processedAt?: Maybe<Scalars['String']['output']>
  title: Scalars['String']['output']
}

export type DocumentPagesArgs = {
  filters?: InputMaybe<PageFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}

export type DocumentFilter = {
  AND?: InputMaybe<DocumentFilter>
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>
  NOT?: InputMaybe<DocumentFilter>
  OR?: InputMaybe<DocumentFilter>
  id?: InputMaybe<Scalars['ID']['input']>
  ids?: InputMaybe<Array<Scalars['ID']['input']>>
  name?: InputMaybe<StrFilterLookup>
  search?: InputMaybe<Scalars['String']['input']>
}

export type File = {
  __typename?: 'File'
  /** The documents that reference this file */
  documents: Array<Document>
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
  store: BigFileStore
}

export type FileDocumentsArgs = {
  filters?: InputMaybe<DocumentFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}

export type FileEvent = {
  __typename?: 'FileEvent'
  create?: Maybe<File>
  delete?: Maybe<Scalars['ID']['output']>
  moved?: Maybe<File>
  update?: Maybe<File>
}

export type FileFilter = {
  AND?: InputMaybe<FileFilter>
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>
  NOT?: InputMaybe<FileFilter>
  OR?: InputMaybe<FileFilter>
  id?: InputMaybe<Scalars['ID']['input']>
  ids?: InputMaybe<Array<Scalars['ID']['input']>>
  name?: InputMaybe<StrFilterLookup>
  search?: InputMaybe<Scalars['String']['input']>
}

export type FromFileLike = {
  dataset?: InputMaybe<Scalars['ID']['input']>
  file: Scalars['FileLike']['input']
  origins?: InputMaybe<Array<Scalars['ID']['input']>>
}

export type Mutation = {
  __typename?: 'Mutation'
  /** Create a new document */
  createDocument: Document
  /** Create a new page in a document */
  createPage: Page
  /** Delete an existing file */
  deleteFile: Scalars['ID']['output']
  /** Create a file from file-like data */
  fromFileLike: File
  /** Request credentials to access a file */
  requestFileAccess: AccessCredentials
  /** Request credentials to upload a new file */
  requestFileUpload: Credentials
  /** Request presigned credentials for file upload */
  requestFileUploadPresigned: PresignedPostCredentials
}

export type MutationCreateDocumentArgs = {
  input: CreateDocumentInput
}

export type MutationCreatePageArgs = {
  input: CreatePageInput
}

export type MutationDeleteFileArgs = {
  input: DeleteFileInput
}

export type MutationFromFileLikeArgs = {
  input: FromFileLike
}

export type MutationRequestFileAccessArgs = {
  input: RequestFileAccessInput
}

export type MutationRequestFileUploadArgs = {
  input: RequestFileUploadInput
}

export type MutationRequestFileUploadPresignedArgs = {
  input: RequestFileUploadInput
}

export type OcrPageResult = {
  __typename?: 'OCRPageResult'
  angle: Scalars['Float']['output']
  lines: Array<OcrTextLine>
}

export type OcrPageResultInput = {
  /** Estimated rotation angle of the page */
  angle: Scalars['Float']['input']
  lines: Array<OcrTextLineInput>
}

export type OcrTextLine = {
  __typename?: 'OCRTextLine'
  angle: Scalars['Float']['output']
  bbox: Array<Array<Scalars['Int']['output']>>
  score: Scalars['Float']['output']
  text: Scalars['String']['output']
}

export type OcrTextLineInput = {
  angle: Scalars['Float']['input']
  bbox: Array<Array<Scalars['Int']['input']>>
  score: Scalars['Float']['input']
  text: Scalars['String']['input']
}

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: Scalars['Int']['input']
}

export type Page = {
  __typename?: 'Page'
  /** The content of the page as a flat string. */
  content: Scalars['String']['output']
  document: Document
  id: Scalars['ID']['output']
  image: BigFileStore
  index: Scalars['Int']['output']
  ocrResult: OcrPageResult
}

export type PageFilter = {
  AND?: InputMaybe<PageFilter>
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>
  NOT?: InputMaybe<PageFilter>
  OR?: InputMaybe<PageFilter>
  id?: InputMaybe<Scalars['ID']['input']>
  ids?: InputMaybe<Array<Scalars['ID']['input']>>
  name?: InputMaybe<StrFilterLookup>
  search?: InputMaybe<Scalars['String']['input']>
}

/** Temporary Credentials for a file upload that can be used by a Client (e.g. in a python datalayer) */
export type PresignedPostCredentials = {
  __typename?: 'PresignedPostCredentials'
  bucket: Scalars['String']['output']
  datalayer: Scalars['String']['output']
  key: Scalars['String']['output']
  policy: Scalars['String']['output']
  store: Scalars['String']['output']
  xAmzAlgorithm: Scalars['String']['output']
  xAmzCredential: Scalars['String']['output']
  xAmzDate: Scalars['String']['output']
  xAmzSignature: Scalars['String']['output']
}

export type Query = {
  __typename?: 'Query'
  document: Document
  documents: Array<Document>
  file: File
  files: Array<File>
  page: Page
  pages: Array<Page>
}

export type QueryDocumentArgs = {
  id: Scalars['ID']['input']
}

export type QueryDocumentsArgs = {
  filters?: InputMaybe<DocumentFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}

export type QueryFileArgs = {
  id: Scalars['ID']['input']
}

export type QueryFilesArgs = {
  filters?: InputMaybe<FileFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}

export type QueryPageArgs = {
  id: Scalars['ID']['input']
}

export type QueryPagesArgs = {
  filters?: InputMaybe<PageFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}

export type RequestFileAccessInput = {
  duration?: InputMaybe<Scalars['Int']['input']>
  store: Scalars['ID']['input']
}

export type RequestFileUploadInput = {
  datalayer: Scalars['String']['input']
  fileName: Scalars['String']['input']
}

export type StrFilterLookup = {
  contains?: InputMaybe<Scalars['String']['input']>
  endsWith?: InputMaybe<Scalars['String']['input']>
  exact?: InputMaybe<Scalars['String']['input']>
  gt?: InputMaybe<Scalars['String']['input']>
  gte?: InputMaybe<Scalars['String']['input']>
  iContains?: InputMaybe<Scalars['String']['input']>
  iEndsWith?: InputMaybe<Scalars['String']['input']>
  iExact?: InputMaybe<Scalars['String']['input']>
  iRegex?: InputMaybe<Scalars['String']['input']>
  iStartsWith?: InputMaybe<Scalars['String']['input']>
  inList?: InputMaybe<Array<Scalars['String']['input']>>
  isNull?: InputMaybe<Scalars['Boolean']['input']>
  lt?: InputMaybe<Scalars['String']['input']>
  lte?: InputMaybe<Scalars['String']['input']>
  range?: InputMaybe<Array<Scalars['String']['input']>>
  regex?: InputMaybe<Scalars['String']['input']>
  startsWith?: InputMaybe<Scalars['String']['input']>
}

export type Subscription = {
  __typename?: 'Subscription'
  /** Subscribe to real-time file updates */
  files: FileEvent
}

export type SubscriptionFilesArgs = {
  dataset?: InputMaybe<Scalars['ID']['input']>
}

export type DocumentFragment = {
  __typename?: 'Document'
  id: string
  title: string
  pages: Array<{
    __typename?: 'Page'
    id: string
    index: number
    content: string
    image: {
      __typename?: 'BigFileStore'
      id: string
      key: string
      bucket: string
      path: string
      presignedUrl: string
    }
    ocrResult: {
      __typename?: 'OCRPageResult'
      angle: number
      lines: Array<{
        __typename?: 'OCRTextLine'
        text: string
        score: number
        angle: number
        bbox: Array<Array<number>>
      }>
    }
  }>
}

export type ListDocumentFragment = { __typename?: 'Document'; id: string; title: string }

export type FileFragment = {
  __typename?: 'File'
  id: string
  name: string
  documents: Array<{ __typename?: 'Document'; id: string; title: string }>
  store: {
    __typename?: 'BigFileStore'
    id: string
    key: string
    bucket: string
    path: string
    presignedUrl: string
  }
}

export type ListFileFragment = { __typename?: 'File'; id: string; name: string }

export type OcrPageResultFragment = {
  __typename?: 'OCRPageResult'
  angle: number
  lines: Array<{
    __typename?: 'OCRTextLine'
    text: string
    score: number
    angle: number
    bbox: Array<Array<number>>
  }>
}

export type PageFragment = {
  __typename?: 'Page'
  id: string
  index: number
  content: string
  image: {
    __typename?: 'BigFileStore'
    id: string
    key: string
    bucket: string
    path: string
    presignedUrl: string
  }
  ocrResult: {
    __typename?: 'OCRPageResult'
    angle: number
    lines: Array<{
      __typename?: 'OCRTextLine'
      text: string
      score: number
      angle: number
      bbox: Array<Array<number>>
    }>
  }
}

export type ListPageFragment = {
  __typename?: 'Page'
  id: string
  index: number
  content: string
  document: { __typename?: 'Document'; id: string; title: string }
}

export type BigFileStoreFragment = {
  __typename?: 'BigFileStore'
  id: string
  key: string
  bucket: string
  path: string
  presignedUrl: string
}

export type GetDocumentQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type GetDocumentQuery = {
  __typename?: 'Query'
  document: {
    __typename?: 'Document'
    id: string
    title: string
    pages: Array<{
      __typename?: 'Page'
      id: string
      index: number
      content: string
      image: {
        __typename?: 'BigFileStore'
        id: string
        key: string
        bucket: string
        path: string
        presignedUrl: string
      }
      ocrResult: {
        __typename?: 'OCRPageResult'
        angle: number
        lines: Array<{
          __typename?: 'OCRTextLine'
          text: string
          score: number
          angle: number
          bbox: Array<Array<number>>
        }>
      }
    }>
  }
}

export type SearchDocumentsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>
}>

export type SearchDocumentsQuery = {
  __typename?: 'Query'
  options: Array<{ __typename?: 'Document'; value: string; label: string }>
}

export type ListDocumentsQueryVariables = Exact<{
  filter?: InputMaybe<DocumentFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}>

export type ListDocumentsQuery = {
  __typename?: 'Query'
  documents: Array<{ __typename?: 'Document'; id: string; title: string }>
}

export type GetFileQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type GetFileQuery = {
  __typename?: 'Query'
  file: {
    __typename?: 'File'
    id: string
    name: string
    documents: Array<{ __typename?: 'Document'; id: string; title: string }>
    store: {
      __typename?: 'BigFileStore'
      id: string
      key: string
      bucket: string
      path: string
      presignedUrl: string
    }
  }
}

export type SearchFilesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>
}>

export type SearchFilesQuery = {
  __typename?: 'Query'
  options: Array<{ __typename?: 'File'; value: string; label: string }>
}

export type ListFilesQueryVariables = Exact<{
  filter?: InputMaybe<FileFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}>

export type ListFilesQuery = {
  __typename?: 'Query'
  files: Array<{ __typename?: 'File'; id: string; name: string }>
}

export type GetPageQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type GetPageQuery = {
  __typename?: 'Query'
  page: {
    __typename?: 'Page'
    id: string
    index: number
    content: string
    image: {
      __typename?: 'BigFileStore'
      id: string
      key: string
      bucket: string
      path: string
      presignedUrl: string
    }
    ocrResult: {
      __typename?: 'OCRPageResult'
      angle: number
      lines: Array<{
        __typename?: 'OCRTextLine'
        text: string
        score: number
        angle: number
        bbox: Array<Array<number>>
      }>
    }
  }
}

export type SearchPagesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>
}>

export type SearchPagesQuery = {
  __typename?: 'Query'
  options: Array<{ __typename?: 'Page'; value: string; label: number }>
}

export type ListPagesQueryVariables = Exact<{
  filter?: InputMaybe<PageFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}>

export type ListPagesQuery = {
  __typename?: 'Query'
  pages: Array<{
    __typename?: 'Page'
    id: string
    index: number
    content: string
    document: { __typename?: 'Document'; id: string; title: string }
  }>
}

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>
}>

export type GlobalSearchQuery = {
  __typename?: 'Query'
  pages: Array<{
    __typename?: 'Page'
    id: string
    index: number
    content: string
    document: { __typename?: 'Document'; id: string; title: string }
  }>
}

export const BigFileStoreFragmentDoc = gql`
  fragment BigFileStore on BigFileStore {
    id
    key
    bucket
    path
    presignedUrl
  }
`
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
`
export const PageFragmentDoc = gql`
  fragment Page on Page {
    id
    index
    content
    image {
      ...BigFileStore
    }
    ocrResult {
      ...OCRPageResult
    }
  }
  ${BigFileStoreFragmentDoc}
  ${OcrPageResultFragmentDoc}
`
export const DocumentFragmentDoc = gql`
  fragment Document on Document {
    id
    title
    pages {
      ...Page
    }
  }
  ${PageFragmentDoc}
`
export const ListDocumentFragmentDoc = gql`
  fragment ListDocument on Document {
    id
    title
  }
`
export const FileFragmentDoc = gql`
  fragment File on File {
    id
    name
    documents {
      ...ListDocument
    }
    store {
      ...BigFileStore
    }
  }
  ${ListDocumentFragmentDoc}
  ${BigFileStoreFragmentDoc}
`
export const ListFileFragmentDoc = gql`
  fragment ListFile on File {
    id
    name
  }
`
export const ListPageFragmentDoc = gql`
  fragment ListPage on Page {
    id
    index
    content
    document {
      id
      title
    }
  }
`
export const GetDocumentDocument = gql`
  query GetDocument($id: ID!) {
    document(id: $id) {
      ...Document
    }
  }
  ${DocumentFragmentDoc}
`

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
export function useGetDocumentQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<GetDocumentQuery, GetDocumentQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<GetDocumentQuery, GetDocumentQueryVariables>(
    GetDocumentDocument,
    options
  )
}
export function useGetDocumentLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDocumentQuery, GetDocumentQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<GetDocumentQuery, GetDocumentQueryVariables>(
    GetDocumentDocument,
    options
  )
}
export type GetDocumentQueryHookResult = ReturnType<typeof useGetDocumentQuery>
export type GetDocumentLazyQueryHookResult = ReturnType<typeof useGetDocumentLazyQuery>
export type GetDocumentQueryResult = Apollo.QueryResult<GetDocumentQuery, GetDocumentQueryVariables>
export const SearchDocumentsDocument = gql`
  query SearchDocuments($search: String, $values: [ID!]) {
    options: documents(filters: { search: $search, ids: $values }, pagination: { limit: 10 }) {
      value: id
      label: title
    }
  }
`

/**
 * __useSearchDocumentsQuery__
 *
 * To run a query within a React component, call `useSearchDocumentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchDocumentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchDocumentsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchDocumentsQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<
    SearchDocumentsQuery,
    SearchDocumentsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<SearchDocumentsQuery, SearchDocumentsQueryVariables>(
    SearchDocumentsDocument,
    options
  )
}
export function useSearchDocumentsLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    SearchDocumentsQuery,
    SearchDocumentsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<SearchDocumentsQuery, SearchDocumentsQueryVariables>(
    SearchDocumentsDocument,
    options
  )
}
export type SearchDocumentsQueryHookResult = ReturnType<typeof useSearchDocumentsQuery>
export type SearchDocumentsLazyQueryHookResult = ReturnType<typeof useSearchDocumentsLazyQuery>
export type SearchDocumentsQueryResult = Apollo.QueryResult<
  SearchDocumentsQuery,
  SearchDocumentsQueryVariables
>
export const ListDocumentsDocument = gql`
  query ListDocuments($filter: DocumentFilter, $pagination: OffsetPaginationInput) {
    documents(filters: $filter, pagination: $pagination) {
      ...ListDocument
    }
  }
  ${ListDocumentFragmentDoc}
`

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
export function useListDocumentsQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<ListDocumentsQuery, ListDocumentsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<ListDocumentsQuery, ListDocumentsQueryVariables>(
    ListDocumentsDocument,
    options
  )
}
export function useListDocumentsLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    ListDocumentsQuery,
    ListDocumentsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<ListDocumentsQuery, ListDocumentsQueryVariables>(
    ListDocumentsDocument,
    options
  )
}
export type ListDocumentsQueryHookResult = ReturnType<typeof useListDocumentsQuery>
export type ListDocumentsLazyQueryHookResult = ReturnType<typeof useListDocumentsLazyQuery>
export type ListDocumentsQueryResult = Apollo.QueryResult<
  ListDocumentsQuery,
  ListDocumentsQueryVariables
>
export const GetFileDocument = gql`
  query GetFile($id: ID!) {
    file(id: $id) {
      ...File
    }
  }
  ${FileFragmentDoc}
`

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
export function useGetFileQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<GetFileQuery, GetFileQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<GetFileQuery, GetFileQueryVariables>(GetFileDocument, options)
}
export function useGetFileLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetFileQuery, GetFileQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<GetFileQuery, GetFileQueryVariables>(
    GetFileDocument,
    options
  )
}
export type GetFileQueryHookResult = ReturnType<typeof useGetFileQuery>
export type GetFileLazyQueryHookResult = ReturnType<typeof useGetFileLazyQuery>
export type GetFileQueryResult = Apollo.QueryResult<GetFileQuery, GetFileQueryVariables>
export const SearchFilesDocument = gql`
  query SearchFiles($search: String, $values: [ID!]) {
    options: files(filters: { search: $search, ids: $values }, pagination: { limit: 10 }) {
      value: id
      label: name
    }
  }
`

/**
 * __useSearchFilesQuery__
 *
 * To run a query within a React component, call `useSearchFilesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchFilesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchFilesQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchFilesQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<SearchFilesQuery, SearchFilesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<SearchFilesQuery, SearchFilesQueryVariables>(
    SearchFilesDocument,
    options
  )
}
export function useSearchFilesLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchFilesQuery, SearchFilesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<SearchFilesQuery, SearchFilesQueryVariables>(
    SearchFilesDocument,
    options
  )
}
export type SearchFilesQueryHookResult = ReturnType<typeof useSearchFilesQuery>
export type SearchFilesLazyQueryHookResult = ReturnType<typeof useSearchFilesLazyQuery>
export type SearchFilesQueryResult = Apollo.QueryResult<SearchFilesQuery, SearchFilesQueryVariables>
export const ListFilesDocument = gql`
  query ListFiles($filter: FileFilter, $pagination: OffsetPaginationInput) {
    files(filters: $filter, pagination: $pagination) {
      ...ListFile
    }
  }
  ${ListFileFragmentDoc}
`

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
export function useListFilesQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<ListFilesQuery, ListFilesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<ListFilesQuery, ListFilesQueryVariables>(
    ListFilesDocument,
    options
  )
}
export function useListFilesLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListFilesQuery, ListFilesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<ListFilesQuery, ListFilesQueryVariables>(
    ListFilesDocument,
    options
  )
}
export type ListFilesQueryHookResult = ReturnType<typeof useListFilesQuery>
export type ListFilesLazyQueryHookResult = ReturnType<typeof useListFilesLazyQuery>
export type ListFilesQueryResult = Apollo.QueryResult<ListFilesQuery, ListFilesQueryVariables>
export const GetPageDocument = gql`
  query GetPage($id: ID!) {
    page(id: $id) {
      ...Page
    }
  }
  ${PageFragmentDoc}
`

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
export function useGetPageQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<GetPageQuery, GetPageQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<GetPageQuery, GetPageQueryVariables>(GetPageDocument, options)
}
export function useGetPageLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetPageQuery, GetPageQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<GetPageQuery, GetPageQueryVariables>(
    GetPageDocument,
    options
  )
}
export type GetPageQueryHookResult = ReturnType<typeof useGetPageQuery>
export type GetPageLazyQueryHookResult = ReturnType<typeof useGetPageLazyQuery>
export type GetPageQueryResult = Apollo.QueryResult<GetPageQuery, GetPageQueryVariables>
export const SearchPagesDocument = gql`
  query SearchPages($search: String, $values: [ID!]) {
    options: pages(filters: { search: $search, ids: $values }, pagination: { limit: 10 }) {
      value: id
      label: index
    }
  }
`

/**
 * __useSearchPagesQuery__
 *
 * To run a query within a React component, call `useSearchPagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchPagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchPagesQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchPagesQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<SearchPagesQuery, SearchPagesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<SearchPagesQuery, SearchPagesQueryVariables>(
    SearchPagesDocument,
    options
  )
}
export function useSearchPagesLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchPagesQuery, SearchPagesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<SearchPagesQuery, SearchPagesQueryVariables>(
    SearchPagesDocument,
    options
  )
}
export type SearchPagesQueryHookResult = ReturnType<typeof useSearchPagesQuery>
export type SearchPagesLazyQueryHookResult = ReturnType<typeof useSearchPagesLazyQuery>
export type SearchPagesQueryResult = Apollo.QueryResult<SearchPagesQuery, SearchPagesQueryVariables>
export const ListPagesDocument = gql`
  query ListPages($filter: PageFilter, $pagination: OffsetPaginationInput) {
    pages(filters: $filter, pagination: $pagination) {
      ...ListPage
    }
  }
  ${ListPageFragmentDoc}
`

/**
 * __useListPagesQuery__
 *
 * To run a query within a React component, call `useListPagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListPagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListPagesQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListPagesQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<ListPagesQuery, ListPagesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<ListPagesQuery, ListPagesQueryVariables>(
    ListPagesDocument,
    options
  )
}
export function useListPagesLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListPagesQuery, ListPagesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<ListPagesQuery, ListPagesQueryVariables>(
    ListPagesDocument,
    options
  )
}
export type ListPagesQueryHookResult = ReturnType<typeof useListPagesQuery>
export type ListPagesLazyQueryHookResult = ReturnType<typeof useListPagesLazyQuery>
export type ListPagesQueryResult = Apollo.QueryResult<ListPagesQuery, ListPagesQueryVariables>
export const GlobalSearchDocument = gql`
  query GlobalSearch($search: String) {
    pages: pages(filters: { search: $search }) {
      ...ListPage
    }
  }
  ${ListPageFragmentDoc}
`

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
export function useGlobalSearchQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(
    GlobalSearchDocument,
    options
  )
}
export function useGlobalSearchLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(
    GlobalSearchDocument,
    options
  )
}
export type GlobalSearchQueryHookResult = ReturnType<typeof useGlobalSearchQuery>
export type GlobalSearchLazyQueryHookResult = ReturnType<typeof useGlobalSearchLazyQuery>
export type GlobalSearchQueryResult = Apollo.QueryResult<
  GlobalSearchQuery,
  GlobalSearchQueryVariables
>
