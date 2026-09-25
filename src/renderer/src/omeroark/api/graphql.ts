import * as ApolloReactHooks from '@/lib/omeroark/funcs';
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
  DateTime: { input: any; output: any }
  _Any: { input: any; output: any }
}

export type CreateDatasetInput = {
  description?: InputMaybe<Scalars['String']['input']>
  name: Scalars['String']['input']
  projectId: Scalars['ID']['input']
}

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>
  name: Scalars['String']['input']
}

export type Dataset = {
  __typename?: 'Dataset'
  description: Scalars['String']['output']
  id: Scalars['String']['output']
  images: Array<Image>
  name: Scalars['String']['output']
  tags: Array<Scalars['String']['output']>
}

export type DatasetFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>
  search?: InputMaybe<Scalars['String']['input']>
}

export type DeleteImageInput = {
  id: Scalars['ID']['input']
}

export type DeleteMeInput = {
  reason?: InputMaybe<Scalars['String']['input']>
}

export type DeleteResult = {
  __typename?: 'DeleteResult'
  id: Scalars['String']['output']
}

export type Image = {
  __typename?: 'Image'
  acquisitionDate?: Maybe<Scalars['DateTime']['output']>
  description: Scalars['String']['output']
  id: Scalars['String']['output']
  name: Scalars['String']['output']
  originalFile?: Maybe<Scalars['String']['output']>
  tags: Array<Scalars['String']['output']>
}

export type ImageFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>
  search?: InputMaybe<Scalars['String']['input']>
}

export type Mutation = {
  __typename?: 'Mutation'
  createDataset: Dataset
  createProject: Project
  deleteImage: DeleteResult
  deleteMe: User
  ensureOmeroUser: OmeroUser
}

export type MutationCreateDatasetArgs = {
  input: CreateDatasetInput
}

export type MutationCreateProjectArgs = {
  input: CreateProjectInput
}

export type MutationDeleteImageArgs = {
  input: DeleteImageInput
}

export type MutationDeleteMeArgs = {
  input: DeleteMeInput
}

export type MutationEnsureOmeroUserArgs = {
  input: OmeroUserInput
}

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: Scalars['Int']['input']
}

/**
 * A dataset is a collection of data files and metadata files.
 * It mimics the concept of a folder in a file system and is the top level
 * object in the data model.
 */
export type OmeroUser = {
  __typename?: 'OmeroUser'
  id: Scalars['ID']['output']
  /** The password for the omero user */
  omeroPassword: Scalars['String']['output']
  /** The username for the omero user */
  omeroUsername: Scalars['String']['output']
  /** The user that created the dataset */
  user: User
}

export type OmeroUserInput = {
  host?: InputMaybe<Scalars['String']['input']>
  password: Scalars['String']['input']
  port?: InputMaybe<Scalars['Int']['input']>
  username: Scalars['String']['input']
}

export type Project = {
  __typename?: 'Project'
  datasets: Array<Dataset>
  description: Scalars['String']['output']
  id: Scalars['String']['output']
  name: Scalars['String']['output']
  tags: Array<Scalars['String']['output']>
}

export type ProjectFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>
  search?: InputMaybe<Scalars['String']['input']>
}

export type Query = {
  __typename?: 'Query'
  _service: _Service
  dataset: Dataset
  datasets: Array<Dataset>
  image: Image
  images: Array<Image>
  me: User
  omeroUsers: Array<OmeroUser>
  project: Project
  projects: Array<Project>
}

export type QueryDatasetArgs = {
  id: Scalars['ID']['input']
}

export type QueryDatasetsArgs = {
  filters?: InputMaybe<DatasetFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}

export type QueryImageArgs = {
  id: Scalars['ID']['input']
}

export type QueryImagesArgs = {
  filters?: InputMaybe<ImageFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}

export type QueryProjectArgs = {
  id: Scalars['ID']['input']
}

export type QueryProjectsArgs = {
  filters?: InputMaybe<ProjectFilter>
  pagination?: InputMaybe<OffsetPaginationInput>
}

/** A reflection on the real User */
export type User = {
  __typename?: 'User'
  email: Scalars['String']['output']
  id: Scalars['ID']['output']
  /** The user that created the dataset */
  omeroUser?: Maybe<OmeroUser>
  password: Scalars['String']['output']
  sub: Scalars['String']['output']
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: Scalars['String']['output']
}

export type _Service = {
  __typename?: '_Service'
  sdl: Scalars['String']['output']
}

export type ListDatasetFragment = {
  __typename?: 'Dataset'
  id: string
  name: string
  description: string
}

export type DatasetFragment = {
  __typename?: 'Dataset'
  id: string
  name: string
  description: string
  tags: Array<string>
  images: Array<{ __typename?: 'Image'; id: string; name: string; description: string }>
}

export type ListOmeroImageFragment = {
  __typename?: 'Image'
  id: string
  name: string
  description: string
}

export type OmeroImageFragment = {
  __typename?: 'Image'
  id: string
  name: string
  acquisitionDate?: any | null
  tags: Array<string>
}

export type ListProjectFragment = {
  __typename?: 'Project'
  id: string
  name: string
  description: string
}

export type ProjectFragment = {
  __typename?: 'Project'
  id: string
  name: string
  description: string
  tags: Array<string>
  datasets: Array<{ __typename?: 'Dataset'; id: string; name: string; description: string }>
}

export type CreateDatasetMutationVariables = Exact<{
  input: CreateDatasetInput
}>

export type CreateDatasetMutation = {
  __typename?: 'Mutation'
  createDataset: { __typename?: 'Dataset'; id: string; name: string; description: string }
}

export type CreateProjectMutationVariables = Exact<{
  input: CreateProjectInput
}>

export type CreateProjectMutation = {
  __typename?: 'Mutation'
  createProject: { __typename?: 'Project'; id: string; name: string; description: string }
}

export type EnsureOmeroUserMutationVariables = Exact<{
  input: OmeroUserInput
}>

export type EnsureOmeroUserMutation = {
  __typename?: 'Mutation'
  ensureOmeroUser: {
    __typename?: 'OmeroUser'
    id: string
    omeroUsername: string
    omeroPassword: string
    user: { __typename?: 'User'; id: string; sub: string }
  }
}

export type DeleteMeMutationVariables = Exact<{
  input: DeleteMeInput
}>

export type DeleteMeMutation = {
  __typename?: 'Mutation'
  deleteMe: { __typename?: 'User'; id: string }
}

export type ListDatasetsQueryVariables = Exact<{ [key: string]: never }>

export type ListDatasetsQuery = {
  __typename?: 'Query'
  datasets: Array<{ __typename?: 'Dataset'; id: string; name: string; description: string }>
}

export type GetDatasetQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type GetDatasetQuery = {
  __typename?: 'Query'
  dataset: {
    __typename?: 'Dataset'
    id: string
    name: string
    description: string
    tags: Array<string>
    images: Array<{ __typename?: 'Image'; id: string; name: string; description: string }>
  }
}

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>
  noImages: Scalars['Boolean']['input']
  pagination?: InputMaybe<OffsetPaginationInput>
}>

export type GlobalSearchQuery = {
  __typename?: 'Query'
  images?: Array<{ __typename?: 'Image'; id: string; name: string; description: string }>
}

export type ListOmeroImagesQueryVariables = Exact<{ [key: string]: never }>

export type ListOmeroImagesQuery = {
  __typename?: 'Query'
  images: Array<{ __typename?: 'Image'; id: string; name: string; description: string }>
}

export type GetOmeroImageQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type GetOmeroImageQuery = {
  __typename?: 'Query'
  image: {
    __typename?: 'Image'
    id: string
    name: string
    acquisitionDate?: any | null
    tags: Array<string>
  }
}

export type MeQueryVariables = Exact<{ [key: string]: never }>

export type MeQuery = {
  __typename?: 'Query'
  me: {
    __typename?: 'User'
    omeroUser?: { __typename?: 'OmeroUser'; id: string; omeroUsername: string } | null
  }
}

export type ListProjectsQueryVariables = Exact<{ [key: string]: never }>

export type ListProjectsQuery = {
  __typename?: 'Query'
  projects: Array<{ __typename?: 'Project'; id: string; name: string; description: string }>
}

export type GetProjectQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type GetProjectQuery = {
  __typename?: 'Query'
  project: {
    __typename?: 'Project'
    id: string
    name: string
    description: string
    tags: Array<string>
    datasets: Array<{ __typename?: 'Dataset'; id: string; name: string; description: string }>
  }
}

export const ListOmeroImageFragmentDoc = gql`
  fragment ListOmeroImage on Image {
    id
    name
    description
  }
`
export const DatasetFragmentDoc = gql`
  fragment Dataset on Dataset {
    id
    name
    description
    images {
      ...ListOmeroImage
    }
    tags
  }
  ${ListOmeroImageFragmentDoc}
`
export const OmeroImageFragmentDoc = gql`
  fragment OmeroImage on Image {
    id
    name
    acquisitionDate
    tags
  }
`
export const ListProjectFragmentDoc = gql`
  fragment ListProject on Project {
    id
    name
    description
  }
`
export const ListDatasetFragmentDoc = gql`
  fragment ListDataset on Dataset {
    id
    name
    description
  }
`
export const ProjectFragmentDoc = gql`
  fragment Project on Project {
    id
    name
    description
    datasets {
      ...ListDataset
    }
    tags
  }
  ${ListDatasetFragmentDoc}
`
export const CreateDatasetDocument = gql`
  mutation CreateDataset($input: CreateDatasetInput!) {
    createDataset(input: $input) {
      id
      name
      description
    }
  }
`
export type CreateDatasetMutationFn = Apollo.MutationFunction<
  CreateDatasetMutation,
  CreateDatasetMutationVariables
>

/**
 * __useCreateDatasetMutation__
 *
 * To run a mutation, you first call `useCreateDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createDatasetMutation, { data, loading, error }] = useCreateDatasetMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateDatasetMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    CreateDatasetMutation,
    CreateDatasetMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<CreateDatasetMutation, CreateDatasetMutationVariables>(
    CreateDatasetDocument,
    options
  )
}
export type CreateDatasetMutationHookResult = ReturnType<typeof useCreateDatasetMutation>
export type CreateDatasetMutationResult = Apollo.MutationResult<CreateDatasetMutation>
export type CreateDatasetMutationOptions = Apollo.BaseMutationOptions<
  CreateDatasetMutation,
  CreateDatasetMutationVariables
>
export const CreateProjectDocument = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      description
    }
  }
`
export type CreateProjectMutationFn = Apollo.MutationFunction<
  CreateProjectMutation,
  CreateProjectMutationVariables
>

/**
 * __useCreateProjectMutation__
 *
 * To run a mutation, you first call `useCreateProjectMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateProjectMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createProjectMutation, { data, loading, error }] = useCreateProjectMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateProjectMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    CreateProjectMutation,
    CreateProjectMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<CreateProjectMutation, CreateProjectMutationVariables>(
    CreateProjectDocument,
    options
  )
}
export type CreateProjectMutationHookResult = ReturnType<typeof useCreateProjectMutation>
export type CreateProjectMutationResult = Apollo.MutationResult<CreateProjectMutation>
export type CreateProjectMutationOptions = Apollo.BaseMutationOptions<
  CreateProjectMutation,
  CreateProjectMutationVariables
>
export const EnsureOmeroUserDocument = gql`
  mutation EnsureOmeroUser($input: OmeroUserInput!) {
    ensureOmeroUser(input: $input) {
      id
      omeroUsername
      omeroPassword
      user {
        id
        sub
      }
    }
  }
`
export type EnsureOmeroUserMutationFn = Apollo.MutationFunction<
  EnsureOmeroUserMutation,
  EnsureOmeroUserMutationVariables
>

/**
 * __useEnsureOmeroUserMutation__
 *
 * To run a mutation, you first call `useEnsureOmeroUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureOmeroUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureOmeroUserMutation, { data, loading, error }] = useEnsureOmeroUserMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useEnsureOmeroUserMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    EnsureOmeroUserMutation,
    EnsureOmeroUserMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<EnsureOmeroUserMutation, EnsureOmeroUserMutationVariables>(
    EnsureOmeroUserDocument,
    options
  )
}
export type EnsureOmeroUserMutationHookResult = ReturnType<typeof useEnsureOmeroUserMutation>
export type EnsureOmeroUserMutationResult = Apollo.MutationResult<EnsureOmeroUserMutation>
export type EnsureOmeroUserMutationOptions = Apollo.BaseMutationOptions<
  EnsureOmeroUserMutation,
  EnsureOmeroUserMutationVariables
>
export const DeleteMeDocument = gql`
  mutation DeleteMe($input: DeleteMeInput!) {
    deleteMe(input: $input) {
      id
    }
  }
`
export type DeleteMeMutationFn = Apollo.MutationFunction<
  DeleteMeMutation,
  DeleteMeMutationVariables
>

/**
 * __useDeleteMeMutation__
 *
 * To run a mutation, you first call `useDeleteMeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMeMutation, { data, loading, error }] = useDeleteMeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeleteMeMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteMeMutation, DeleteMeMutationVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<DeleteMeMutation, DeleteMeMutationVariables>(
    DeleteMeDocument,
    options
  )
}
export type DeleteMeMutationHookResult = ReturnType<typeof useDeleteMeMutation>
export type DeleteMeMutationResult = Apollo.MutationResult<DeleteMeMutation>
export type DeleteMeMutationOptions = Apollo.BaseMutationOptions<
  DeleteMeMutation,
  DeleteMeMutationVariables
>
export const ListDatasetsDocument = gql`
  query ListDatasets {
    datasets {
      ...ListDataset
    }
  }
  ${ListDatasetFragmentDoc}
`

/**
 * __useListDatasetsQuery__
 *
 * To run a query within a React component, call `useListDatasetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListDatasetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListDatasetsQuery({
 *   variables: {
 *   },
 * });
 */
export function useListDatasetsQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<ListDatasetsQuery, ListDatasetsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<ListDatasetsQuery, ListDatasetsQueryVariables>(
    ListDatasetsDocument,
    options
  )
}
export function useListDatasetsLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListDatasetsQuery, ListDatasetsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<ListDatasetsQuery, ListDatasetsQueryVariables>(
    ListDatasetsDocument,
    options
  )
}
export type ListDatasetsQueryHookResult = ReturnType<typeof useListDatasetsQuery>
export type ListDatasetsLazyQueryHookResult = ReturnType<typeof useListDatasetsLazyQuery>
export type ListDatasetsQueryResult = Apollo.QueryResult<
  ListDatasetsQuery,
  ListDatasetsQueryVariables
>
export const GetDatasetDocument = gql`
  query GetDataset($id: ID!) {
    dataset(id: $id) {
      ...Dataset
    }
  }
  ${DatasetFragmentDoc}
`

/**
 * __useGetDatasetQuery__
 *
 * To run a query within a React component, call `useGetDatasetQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDatasetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDatasetQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetDatasetQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<GetDatasetQuery, GetDatasetQueryVariables>(
    GetDatasetDocument,
    options
  )
}
export function useGetDatasetLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<GetDatasetQuery, GetDatasetQueryVariables>(
    GetDatasetDocument,
    options
  )
}
export type GetDatasetQueryHookResult = ReturnType<typeof useGetDatasetQuery>
export type GetDatasetLazyQueryHookResult = ReturnType<typeof useGetDatasetLazyQuery>
export type GetDatasetQueryResult = Apollo.QueryResult<GetDatasetQuery, GetDatasetQueryVariables>
export const GlobalSearchDocument = gql`
  query GlobalSearch($search: String, $noImages: Boolean!, $pagination: OffsetPaginationInput) {
    images: images(filters: { search: $search }, pagination: $pagination) @skip(if: $noImages) {
      ...ListOmeroImage
    }
  }
  ${ListOmeroImageFragmentDoc}
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
 *      noImages: // value for 'noImages'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGlobalSearchQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>
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
export const ListOmeroImagesDocument = gql`
  query ListOmeroImages {
    images {
      ...ListOmeroImage
    }
  }
  ${ListOmeroImageFragmentDoc}
`

/**
 * __useListOmeroImagesQuery__
 *
 * To run a query within a React component, call `useListOmeroImagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListOmeroImagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListOmeroImagesQuery({
 *   variables: {
 *   },
 * });
 */
export function useListOmeroImagesQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<
    ListOmeroImagesQuery,
    ListOmeroImagesQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<ListOmeroImagesQuery, ListOmeroImagesQueryVariables>(
    ListOmeroImagesDocument,
    options
  )
}
export function useListOmeroImagesLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    ListOmeroImagesQuery,
    ListOmeroImagesQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<ListOmeroImagesQuery, ListOmeroImagesQueryVariables>(
    ListOmeroImagesDocument,
    options
  )
}
export type ListOmeroImagesQueryHookResult = ReturnType<typeof useListOmeroImagesQuery>
export type ListOmeroImagesLazyQueryHookResult = ReturnType<typeof useListOmeroImagesLazyQuery>
export type ListOmeroImagesQueryResult = Apollo.QueryResult<
  ListOmeroImagesQuery,
  ListOmeroImagesQueryVariables
>
export const GetOmeroImageDocument = gql`
  query GetOmeroImage($id: ID!) {
    image(id: $id) {
      ...OmeroImage
    }
  }
  ${OmeroImageFragmentDoc}
`

/**
 * __useGetOmeroImageQuery__
 *
 * To run a query within a React component, call `useGetOmeroImageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOmeroImageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOmeroImageQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetOmeroImageQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<GetOmeroImageQuery, GetOmeroImageQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<GetOmeroImageQuery, GetOmeroImageQueryVariables>(
    GetOmeroImageDocument,
    options
  )
}
export function useGetOmeroImageLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetOmeroImageQuery,
    GetOmeroImageQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<GetOmeroImageQuery, GetOmeroImageQueryVariables>(
    GetOmeroImageDocument,
    options
  )
}
export type GetOmeroImageQueryHookResult = ReturnType<typeof useGetOmeroImageQuery>
export type GetOmeroImageLazyQueryHookResult = ReturnType<typeof useGetOmeroImageLazyQuery>
export type GetOmeroImageQueryResult = Apollo.QueryResult<
  GetOmeroImageQuery,
  GetOmeroImageQueryVariables
>
export const MeDocument = gql`
  query Me {
    me {
      omeroUser {
        id
        omeroUsername
      }
    }
  }
`

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
export function useMeQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<MeQuery, MeQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<MeQuery, MeQueryVariables>(MeDocument, options)
}
export function useMeLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MeQuery, MeQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options)
}
export type MeQueryHookResult = ReturnType<typeof useMeQuery>
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>
export const ListProjectsDocument = gql`
  query ListProjects {
    projects {
      ...ListProject
    }
  }
  ${ListProjectFragmentDoc}
`

/**
 * __useListProjectsQuery__
 *
 * To run a query within a React component, call `useListProjectsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListProjectsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListProjectsQuery({
 *   variables: {
 *   },
 * });
 */
export function useListProjectsQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<ListProjectsQuery, ListProjectsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<ListProjectsQuery, ListProjectsQueryVariables>(
    ListProjectsDocument,
    options
  )
}
export function useListProjectsLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListProjectsQuery, ListProjectsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<ListProjectsQuery, ListProjectsQueryVariables>(
    ListProjectsDocument,
    options
  )
}
export type ListProjectsQueryHookResult = ReturnType<typeof useListProjectsQuery>
export type ListProjectsLazyQueryHookResult = ReturnType<typeof useListProjectsLazyQuery>
export type ListProjectsQueryResult = Apollo.QueryResult<
  ListProjectsQuery,
  ListProjectsQueryVariables
>
export const GetProjectDocument = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      ...Project
    }
  }
  ${ProjectFragmentDoc}
`

/**
 * __useGetProjectQuery__
 *
 * To run a query within a React component, call `useGetProjectQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetProjectQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetProjectQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetProjectQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<GetProjectQuery, GetProjectQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<GetProjectQuery, GetProjectQueryVariables>(
    GetProjectDocument,
    options
  )
}
export function useGetProjectLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetProjectQuery, GetProjectQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<GetProjectQuery, GetProjectQueryVariables>(
    GetProjectDocument,
    options
  )
}
export type GetProjectQueryHookResult = ReturnType<typeof useGetProjectQuery>
export type GetProjectLazyQueryHookResult = ReturnType<typeof useGetProjectLazyQuery>
export type GetProjectQueryResult = Apollo.QueryResult<GetProjectQuery, GetProjectQueryVariables>
