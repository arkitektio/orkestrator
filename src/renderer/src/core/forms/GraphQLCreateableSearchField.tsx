import { useCallback } from "react";
import {
  CreatableSearchFieldProps,
  CreateableSearchField,
} from "./CreateableSearchField";
import { Option } from "./SearchField";

export type GraphQLSearchFieldProps = Omit<
  CreatableSearchFieldProps,
  "search" | "create"
> & {
  searchQuery: (x: {
    variables: { search?: string | undefined; values?: string[] };
  }) => Promise<{ data?: { options: Option[] }; errors?: any }>;
  createMutation: (x: { variables: { input: string } }) => Promise<{
    data?:
    | { result?: { value?: string | number } | null | undefined }
    | null
    | undefined;
    errors?: any;
  }>;
};

export const GraphQLCreatableSearchField = ({
  searchQuery,
  createMutation,
  ...props
}: GraphQLSearchFieldProps) => {
  const search = useCallback(
    async (x: {
      search?: string | undefined;
      values?: (string | number)[] | undefined;
    }) => {
      const queryResult = await searchQuery({
        variables: {
          search: x.search,
          values: x.values?.map((x) => x.toString()),
        },
      });
      if (queryResult?.errors) {
        throw new Error(queryResult.errors[0].message);
      }
      if (!queryResult.data) {
        throw new Error("No data");
      }
      return queryResult.data?.options;
    },
    [searchQuery],
  );

  const create = useCallback(
    async (input: string) => {
      const queryResult = await createMutation({
        variables: { input: input },
      });
      if (queryResult?.errors) {
        throw new Error(queryResult.errors[0].message);
      }
      if (!queryResult.data) {
        throw new Error("No data");
      }
      if (!queryResult.data.result?.value) {
        throw new Error("No value");
      }
      return queryResult.data.result?.value;
    },
    [createMutation],
  );

  return <CreateableSearchField {...props} search={search} create={create} />;
};
