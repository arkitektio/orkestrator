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
};

export type CreateDatasetInput = {
  description?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  projectId: Scalars['ID'];
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
};

export type Dataset = {
  __typename?: 'Dataset';
  description: Scalars['String'];
  id: Scalars['String'];
  images: Array<Image>;
  name: Scalars['String'];
  tags: Array<Scalars['String']>;
};

export type DatasetFilter = {
  ids?: InputMaybe<Array<Scalars['ID']>>;
  search?: InputMaybe<Scalars['String']>;
};

export type DeleteImageInput = {
  id: Scalars['ID'];
};

export type DeleteResult = {
  __typename?: 'DeleteResult';
  id: Scalars['String'];
};

export type Image = {
  __typename?: 'Image';
  acquisitionDate?: Maybe<Scalars['DateTime']>;
  description: Scalars['String'];
  id: Scalars['String'];
  name: Scalars['String'];
  originalFile?: Maybe<Scalars['String']>;
  tags: Array<Scalars['String']>;
};

export type ImageFilter = {
  ids?: InputMaybe<Array<Scalars['ID']>>;
  search?: InputMaybe<Scalars['String']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createDataset: Dataset;
  createProject: Project;
  deleteImage: DeleteResult;
  deleteMe: User;
  ensureOmeroUser: OmeroUser;
};


export type MutationCreateDatasetArgs = {
  input: CreateDatasetInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationDeleteImageArgs = {
  input: DeleteImageInput;
};


export type MutationEnsureOmeroUserArgs = {
  input: OmeroUserInput;
};

export type OffsetPaginationInput = {
  limit?: Scalars['Int'];
  offset?: Scalars['Int'];
};

export type OmeroUser = {
  __typename?: 'OmeroUser';
  id: Scalars['ID'];
  omeroPassword: Scalars['String'];
  omeroUsername: Scalars['String'];
  user: User;
};

export type OmeroUserInput = {
  host?: InputMaybe<Scalars['String']>;
  password: Scalars['String'];
  port?: InputMaybe<Scalars['Int']>;
  username: Scalars['String'];
};

export type Project = {
  __typename?: 'Project';
  datasets: Array<Dataset>;
  description: Scalars['String'];
  id: Scalars['String'];
  name: Scalars['String'];
  tags: Array<Scalars['String']>;
};

export type ProjectFilter = {
  ids?: InputMaybe<Array<Scalars['ID']>>;
  search?: InputMaybe<Scalars['String']>;
};

export type Query = {
  __typename?: 'Query';
  dataset: Dataset;
  datasets: Array<Dataset>;
  image: Image;
  images: Array<Image>;
  me: User;
  omeroUsers: Array<OmeroUser>;
  project: Project;
  projects: Array<Project>;
};


export type QueryDatasetArgs = {
  id: Scalars['ID'];
};


export type QueryDatasetsArgs = {
  filters?: InputMaybe<DatasetFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryImageArgs = {
  id: Scalars['ID'];
};


export type QueryImagesArgs = {
  filters?: InputMaybe<ImageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryProjectArgs = {
  id: Scalars['ID'];
};


export type QueryProjectsArgs = {
  filters?: InputMaybe<ProjectFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type User = {
  __typename?: 'User';
  email: Scalars['String'];
  id: Scalars['ID'];
  omeroUser?: Maybe<OmeroUser>;
  password: Scalars['String'];
  sub: Scalars['String'];
  username: Scalars['String'];
};

export type ListDatasetFragment = { __typename?: 'Dataset', id: string, name: string, description: string };

export type DatasetFragment = { __typename?: 'Dataset', id: string, name: string, description: string, tags: Array<string>, images: Array<{ __typename?: 'Image', id: string, name: string, description: string }> };

export type ListImageFragment = { __typename?: 'Image', id: string, name: string, description: string };

export type ImageFragment = { __typename?: 'Image', id: string, name: string, acquisitionDate?: any | null, tags: Array<string> };

export type ListProjectFragment = { __typename?: 'Project', id: string, name: string, description: string };

export type ProjectFragment = { __typename?: 'Project', id: string, name: string, description: string, tags: Array<string>, datasets: Array<{ __typename?: 'Dataset', id: string, name: string, description: string }> };

export type CreateDatasetMutationVariables = Exact<{
  name: Scalars['String'];
  description?: InputMaybe<Scalars['String']>;
  projectId: Scalars['ID'];
}>;


export type CreateDatasetMutation = { __typename?: 'Mutation', createDataset: { __typename?: 'Dataset', id: string, name: string } };

export type DeleteImageMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteImageMutation = { __typename?: 'Mutation', deleteImage: { __typename?: 'DeleteResult', id: string } };

export type CreateProjectMutationVariables = Exact<{
  name: Scalars['String'];
  description?: InputMaybe<Scalars['String']>;
}>;


export type CreateProjectMutation = { __typename?: 'Mutation', createProject: { __typename?: 'Project', id: string, name: string } };

export type EnsureOmeroUserMutationVariables = Exact<{
  username: Scalars['String'];
  password: Scalars['String'];
  host?: InputMaybe<Scalars['String']>;
  port?: InputMaybe<Scalars['Int']>;
}>;


export type EnsureOmeroUserMutation = { __typename?: 'Mutation', ensureOmeroUser: { __typename?: 'OmeroUser', id: string, omeroUsername: string, omeroPassword: string, user: { __typename?: 'User', id: string, sub: string } } };

export type DeleteMeMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteMeMutation = { __typename?: 'Mutation', deleteMe: { __typename?: 'User', id: string, sub: string } };

export type ListDatasetsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListDatasetsQuery = { __typename?: 'Query', datasets: Array<{ __typename?: 'Dataset', id: string, name: string, description: string }> };

export type GetDatasetQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetDatasetQuery = { __typename?: 'Query', dataset: { __typename?: 'Dataset', id: string, name: string, description: string, tags: Array<string>, images: Array<{ __typename?: 'Image', id: string, name: string, description: string }> } };

export type ListImagesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListImagesQuery = { __typename?: 'Query', images: Array<{ __typename?: 'Image', id: string, name: string, description: string }> };

export type GetImageQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetImageQuery = { __typename?: 'Query', image: { __typename?: 'Image', id: string, name: string, acquisitionDate?: any | null, tags: Array<string> } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', omeroUser?: { __typename?: 'OmeroUser', id: string, omeroUsername: string } | null } };

export type ListProjectsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListProjectsQuery = { __typename?: 'Query', projects: Array<{ __typename?: 'Project', id: string, name: string, description: string }> };

export type GetProjectQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetProjectQuery = { __typename?: 'Query', project: { __typename?: 'Project', id: string, name: string, description: string, tags: Array<string>, datasets: Array<{ __typename?: 'Dataset', id: string, name: string, description: string }> } };

export const ListImageFragmentDoc = gql`
    fragment ListImage on Image {
  id
  name
  description
}
    `;
export const DatasetFragmentDoc = gql`
    fragment Dataset on Dataset {
  id
  name
  description
  images {
    ...ListImage
  }
  tags
}
    ${ListImageFragmentDoc}`;
export const ImageFragmentDoc = gql`
    fragment Image on Image {
  id
  name
  acquisitionDate
  tags
}
    `;
export const ListProjectFragmentDoc = gql`
    fragment ListProject on Project {
  id
  name
  description
}
    `;
export const ListDatasetFragmentDoc = gql`
    fragment ListDataset on Dataset {
  id
  name
  description
}
    `;
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
    ${ListDatasetFragmentDoc}`;
export const CreateDatasetDocument = gql`
    mutation CreateDataset($name: String!, $description: String, $projectId: ID!) {
  createDataset(
    input: {name: $name, description: $description, projectId: $projectId}
  ) {
    id
    name
  }
}
    `;
export type CreateDatasetMutationFn = Apollo.MutationFunction<CreateDatasetMutation, CreateDatasetMutationVariables>;

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
 *      name: // value for 'name'
 *      description: // value for 'description'
 *      projectId: // value for 'projectId'
 *   },
 * });
 */
export function useCreateDatasetMutation(baseOptions?: Apollo.MutationHookOptions<CreateDatasetMutation, CreateDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateDatasetMutation, CreateDatasetMutationVariables>(CreateDatasetDocument, options);
      }
export type CreateDatasetMutationHookResult = ReturnType<typeof useCreateDatasetMutation>;
export type CreateDatasetMutationResult = Apollo.MutationResult<CreateDatasetMutation>;
export type CreateDatasetMutationOptions = Apollo.BaseMutationOptions<CreateDatasetMutation, CreateDatasetMutationVariables>;
export const DeleteImageDocument = gql`
    mutation DeleteImage($id: ID!) {
  deleteImage(input: {id: $id}) {
    id
  }
}
    `;
export type DeleteImageMutationFn = Apollo.MutationFunction<DeleteImageMutation, DeleteImageMutationVariables>;

/**
 * __useDeleteImageMutation__
 *
 * To run a mutation, you first call `useDeleteImageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteImageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteImageMutation, { data, loading, error }] = useDeleteImageMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteImageMutation(baseOptions?: Apollo.MutationHookOptions<DeleteImageMutation, DeleteImageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteImageMutation, DeleteImageMutationVariables>(DeleteImageDocument, options);
      }
export type DeleteImageMutationHookResult = ReturnType<typeof useDeleteImageMutation>;
export type DeleteImageMutationResult = Apollo.MutationResult<DeleteImageMutation>;
export type DeleteImageMutationOptions = Apollo.BaseMutationOptions<DeleteImageMutation, DeleteImageMutationVariables>;
export const CreateProjectDocument = gql`
    mutation CreateProject($name: String!, $description: String) {
  createProject(input: {name: $name, description: $description}) {
    id
    name
  }
}
    `;
export type CreateProjectMutationFn = Apollo.MutationFunction<CreateProjectMutation, CreateProjectMutationVariables>;

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
 *      name: // value for 'name'
 *      description: // value for 'description'
 *   },
 * });
 */
export function useCreateProjectMutation(baseOptions?: Apollo.MutationHookOptions<CreateProjectMutation, CreateProjectMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateProjectMutation, CreateProjectMutationVariables>(CreateProjectDocument, options);
      }
export type CreateProjectMutationHookResult = ReturnType<typeof useCreateProjectMutation>;
export type CreateProjectMutationResult = Apollo.MutationResult<CreateProjectMutation>;
export type CreateProjectMutationOptions = Apollo.BaseMutationOptions<CreateProjectMutation, CreateProjectMutationVariables>;
export const EnsureOmeroUserDocument = gql`
    mutation EnsureOmeroUser($username: String!, $password: String!, $host: String, $port: Int) {
  ensureOmeroUser(
    input: {username: $username, password: $password, host: $host, port: $port}
  ) {
    id
    omeroUsername
    omeroPassword
    user {
      id
      sub
    }
  }
}
    `;
export type EnsureOmeroUserMutationFn = Apollo.MutationFunction<EnsureOmeroUserMutation, EnsureOmeroUserMutationVariables>;

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
 *      username: // value for 'username'
 *      password: // value for 'password'
 *      host: // value for 'host'
 *      port: // value for 'port'
 *   },
 * });
 */
export function useEnsureOmeroUserMutation(baseOptions?: Apollo.MutationHookOptions<EnsureOmeroUserMutation, EnsureOmeroUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnsureOmeroUserMutation, EnsureOmeroUserMutationVariables>(EnsureOmeroUserDocument, options);
      }
export type EnsureOmeroUserMutationHookResult = ReturnType<typeof useEnsureOmeroUserMutation>;
export type EnsureOmeroUserMutationResult = Apollo.MutationResult<EnsureOmeroUserMutation>;
export type EnsureOmeroUserMutationOptions = Apollo.BaseMutationOptions<EnsureOmeroUserMutation, EnsureOmeroUserMutationVariables>;
export const DeleteMeDocument = gql`
    mutation DeleteMe {
  deleteMe {
    id
    sub
  }
}
    `;
export type DeleteMeMutationFn = Apollo.MutationFunction<DeleteMeMutation, DeleteMeMutationVariables>;

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
 *   },
 * });
 */
export function useDeleteMeMutation(baseOptions?: Apollo.MutationHookOptions<DeleteMeMutation, DeleteMeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteMeMutation, DeleteMeMutationVariables>(DeleteMeDocument, options);
      }
export type DeleteMeMutationHookResult = ReturnType<typeof useDeleteMeMutation>;
export type DeleteMeMutationResult = Apollo.MutationResult<DeleteMeMutation>;
export type DeleteMeMutationOptions = Apollo.BaseMutationOptions<DeleteMeMutation, DeleteMeMutationVariables>;
export const ListDatasetsDocument = gql`
    query ListDatasets {
  datasets {
    ...ListDataset
  }
}
    ${ListDatasetFragmentDoc}`;

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
export function useListDatasetsQuery(baseOptions?: Apollo.QueryHookOptions<ListDatasetsQuery, ListDatasetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListDatasetsQuery, ListDatasetsQueryVariables>(ListDatasetsDocument, options);
      }
export function useListDatasetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListDatasetsQuery, ListDatasetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListDatasetsQuery, ListDatasetsQueryVariables>(ListDatasetsDocument, options);
        }
export type ListDatasetsQueryHookResult = ReturnType<typeof useListDatasetsQuery>;
export type ListDatasetsLazyQueryHookResult = ReturnType<typeof useListDatasetsLazyQuery>;
export type ListDatasetsQueryResult = Apollo.QueryResult<ListDatasetsQuery, ListDatasetsQueryVariables>;
export const GetDatasetDocument = gql`
    query GetDataset($id: ID!) {
  dataset(id: $id) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;

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
export function useGetDatasetQuery(baseOptions: Apollo.QueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetDatasetQuery, GetDatasetQueryVariables>(GetDatasetDocument, options);
      }
export function useGetDatasetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetDatasetQuery, GetDatasetQueryVariables>(GetDatasetDocument, options);
        }
export type GetDatasetQueryHookResult = ReturnType<typeof useGetDatasetQuery>;
export type GetDatasetLazyQueryHookResult = ReturnType<typeof useGetDatasetLazyQuery>;
export type GetDatasetQueryResult = Apollo.QueryResult<GetDatasetQuery, GetDatasetQueryVariables>;
export const ListImagesDocument = gql`
    query ListImages {
  images {
    ...ListImage
  }
}
    ${ListImageFragmentDoc}`;

/**
 * __useListImagesQuery__
 *
 * To run a query within a React component, call `useListImagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListImagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListImagesQuery({
 *   variables: {
 *   },
 * });
 */
export function useListImagesQuery(baseOptions?: Apollo.QueryHookOptions<ListImagesQuery, ListImagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListImagesQuery, ListImagesQueryVariables>(ListImagesDocument, options);
      }
export function useListImagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListImagesQuery, ListImagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListImagesQuery, ListImagesQueryVariables>(ListImagesDocument, options);
        }
export type ListImagesQueryHookResult = ReturnType<typeof useListImagesQuery>;
export type ListImagesLazyQueryHookResult = ReturnType<typeof useListImagesLazyQuery>;
export type ListImagesQueryResult = Apollo.QueryResult<ListImagesQuery, ListImagesQueryVariables>;
export const GetImageDocument = gql`
    query GetImage($id: ID!) {
  image(id: $id) {
    ...Image
  }
}
    ${ImageFragmentDoc}`;

/**
 * __useGetImageQuery__
 *
 * To run a query within a React component, call `useGetImageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetImageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetImageQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetImageQuery(baseOptions: Apollo.QueryHookOptions<GetImageQuery, GetImageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetImageQuery, GetImageQueryVariables>(GetImageDocument, options);
      }
export function useGetImageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetImageQuery, GetImageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetImageQuery, GetImageQueryVariables>(GetImageDocument, options);
        }
export type GetImageQueryHookResult = ReturnType<typeof useGetImageQuery>;
export type GetImageLazyQueryHookResult = ReturnType<typeof useGetImageLazyQuery>;
export type GetImageQueryResult = Apollo.QueryResult<GetImageQuery, GetImageQueryVariables>;
export const MeDocument = gql`
    query Me {
  me {
    omeroUser {
      id
      omeroUsername
    }
  }
}
    `;

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
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const ListProjectsDocument = gql`
    query ListProjects {
  projects {
    ...ListProject
  }
}
    ${ListProjectFragmentDoc}`;

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
export function useListProjectsQuery(baseOptions?: Apollo.QueryHookOptions<ListProjectsQuery, ListProjectsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListProjectsQuery, ListProjectsQueryVariables>(ListProjectsDocument, options);
      }
export function useListProjectsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListProjectsQuery, ListProjectsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListProjectsQuery, ListProjectsQueryVariables>(ListProjectsDocument, options);
        }
export type ListProjectsQueryHookResult = ReturnType<typeof useListProjectsQuery>;
export type ListProjectsLazyQueryHookResult = ReturnType<typeof useListProjectsLazyQuery>;
export type ListProjectsQueryResult = Apollo.QueryResult<ListProjectsQuery, ListProjectsQueryVariables>;
export const GetProjectDocument = gql`
    query GetProject($id: ID!) {
  project(id: $id) {
    ...Project
  }
}
    ${ProjectFragmentDoc}`;

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
export function useGetProjectQuery(baseOptions: Apollo.QueryHookOptions<GetProjectQuery, GetProjectQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetProjectQuery, GetProjectQueryVariables>(GetProjectDocument, options);
      }
export function useGetProjectLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetProjectQuery, GetProjectQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetProjectQuery, GetProjectQueryVariables>(GetProjectDocument, options);
        }
export type GetProjectQueryHookResult = ReturnType<typeof useGetProjectQuery>;
export type GetProjectLazyQueryHookResult = ReturnType<typeof useGetProjectLazyQuery>;
export type GetProjectQueryResult = Apollo.QueryResult<GetProjectQuery, GetProjectQueryVariables>;