import { useCallback } from "react";
import {
  ListSearchField,
  ListSearchFieldProps,
  Option,
} from "./ListSearchField";

export type GraphQLListSearchFieldProps = Omit<
  ListSearchFieldProps,
  "search"
> & {
  searchQuery: (x: {
    variables: { search?: string | undefined; values?: string[] };
  }) => Promise<{ data?: { options: Option[] }; errors?: any }>;
  additionalVariables?: Record<string, any>;
};

export const GraphQLListSearchField = ({
  searchQuery,
  additionalVariables,
  ...props
}: GraphQLListSearchFieldProps) => {
  const search = useCallback(
    async (x: {
      search?: string | undefined;
      values?: (string | number)[] | undefined;
    }) => {
      const queryResult = await searchQuery({
        variables: {
          search: x.search,
          values: x.values?.map((x) => x.toString()),
          ...additionalVariables,
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

  return <ListSearchField {...props} search={search} />;
};
