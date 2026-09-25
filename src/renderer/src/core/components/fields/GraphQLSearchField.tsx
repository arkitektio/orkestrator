import { useCallback } from "react";
import { Option, SearchField, SearchFieldProps } from "./SearchField";

export type GraphQLSearchFieldProps = Omit<SearchFieldProps, "search"> & {
  searchQuery: (x: {
    variables: { search?: string | undefined; values?: string[] };
  }) => Promise<{ data?: { options: Option[] }; errors?: any }>;
  additionalVariables?: Record<string, any>;
};

export const GraphQLSearchField = ({
  searchQuery,
  additionalVariables,
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
          ...additionalVariables
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
    // Serialized, not the object itself: callers pass an inline literal, so a
    // fresh identity every render would make a fresh `search`, which
    // `SearchField`'s options effect depends on — an endless re-query. Leaving
    // it out entirely is worse: a scoped picker would never notice its scope
    // changing.
    [searchQuery, JSON.stringify(additionalVariables)],
  );

  return <SearchField {...props} search={search} />;
};
