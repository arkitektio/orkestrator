import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
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
  DateTime: { input: any; output: any; }
};

export type Dataset = {
  __typename?: 'Dataset';
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  images: Array<Image>;
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
};

export type DatasetFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Image = {
  __typename?: 'Image';
  acquisitionDate?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  originalFile?: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
};

export type ImageFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  ensureOmeroUser: OmeroUser;
};


export type MutationEnsureOmeroUserArgs = {
  input: OmerUserInput;
};

export type OffsetPaginationInput = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type OmerUserInput = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type OmeroUser = {
  __typename?: 'OmeroUser';
  id: Scalars['ID']['output'];
  omeroPassword: Scalars['String']['output'];
  omeroUsername: Scalars['String']['output'];
  user: User;
};

export type Project = {
  __typename?: 'Project';
  datasets: Array<Dataset>;
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
};

export type ProjectFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  dataset: Dataset;
  datasets: Dataset;
  image: Image;
  images: Image;
  me: User;
  omeroUsers: Array<OmeroUser>;
  project: Project;
  projects: Array<Project>;
};


export type QueryDatasetArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDatasetsArgs = {
  filters?: InputMaybe<DatasetFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryImageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryImagesArgs = {
  filters?: InputMaybe<ImageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectsArgs = {
  filters?: InputMaybe<ProjectFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  omeroUser?: Maybe<OmeroUser>;
  password: Scalars['String']['output'];
  sub: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type ListDatasetFragment = { __typename?: 'Dataset', id: string, name: string, description: string };

export type DatasetFragment = { __typename?: 'Dataset', id: string, name: string, description: string, images: Array<{ __typename?: 'Image', id: string, name: string, description: string }> };

export type ListImageFragment = { __typename?: 'Image', id: string, name: string, description: string };

export type ImageFragment = { __typename?: 'Image', id: string, name: string, acquisitionDate?: any | null, tags: Array<string> };

export type ListProjectFragment = { __typename?: 'Project', id: string, name: string, description: string };

export type ProjectFragment = { __typename?: 'Project', id: string, name: string, description: string, tags: Array<string>, datasets: Array<{ __typename?: 'Dataset', id: string, name: string, description: string }> };

export type EnsureOmeroUserMutationVariables = Exact<{
  username: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type EnsureOmeroUserMutation = { __typename?: 'Mutation', ensureOmeroUser: { __typename?: 'OmeroUser', id: string, omeroUsername: string, omeroPassword: string, user: { __typename?: 'User', id: string, sub: string } } };

export type ListDatasetsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListDatasetsQuery = { __typename?: 'Query', datasets: { __typename?: 'Dataset', id: string, name: string, description: string } };

export type GetDatasetQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDatasetQuery = { __typename?: 'Query', dataset: { __typename?: 'Dataset', id: string, name: string, description: string, images: Array<{ __typename?: 'Image', id: string, name: string, description: string }> } };

export type ListImagesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListImagesQuery = { __typename?: 'Query', images: { __typename?: 'Image', id: string, name: string, description: string } };

export type GetImageQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetImageQuery = { __typename?: 'Query', image: { __typename?: 'Image', id: string, name: string, acquisitionDate?: any | null, tags: Array<string> } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', omeroUser?: { __typename?: 'OmeroUser', id: string, omeroUsername: string } | null } };

export type ListProjectsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListProjectsQuery = { __typename?: 'Query', projects: Array<{ __typename?: 'Project', id: string, name: string, description: string }> };

export type GetProjectQueryVariables = Exact<{
  id: Scalars['ID']['input'];
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
export const EnsureOmeroUserDocument = gql`
    mutation EnsureOmeroUser($username: String!, $password: String!) {
  ensureOmeroUser(input: {username: $username, password: $password}) {
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