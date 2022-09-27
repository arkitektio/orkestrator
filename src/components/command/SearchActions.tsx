import React from "react";
import { useNavigate } from "react-router";
import { Representation } from "../../linker";
import { useSearchableRepresentationsLazyQuery } from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/mikro-types";
import { queryfiltered } from "./GeneralMenu";
import { Extension, useExtension } from "./GeneralMenuContext";

export interface NavigationActionsProps {}

export const SearchActions: React.FC<NavigationActionsProps> = ({}) => {
  const [searchRepresentation] = withMikro(
    useSearchableRepresentationsLazyQuery
  )();

  const navigate = useNavigate();

  const handler: Extension = {
    key: "globalsearch",
    label: "Search Images...",
    filter: async ({ query, modifiers }) => {
      if (!modifiers.find((x) => x.key == "search")) {
        return [];
      }

      const { data } = await searchRepresentation({
        variables: { name: query },
      });

      const results = data?.myrepresentations?.map((representation) => {
        return {
          extension: "globalsearch",
          key: "representation-" + representation?.id,
          label: representation?.name || "unknown",
          params: {
            type: "representation",
            representation: representation?.id,
          },
          description: "Navigate to " + representation?.name,
        };
      });

      return queryfiltered(results, query);
    },
    do: async (action) => {
      navigate(Representation.linkBuilder(action.params?.representation));
    },
  };

  useExtension(handler);

  return <></>;
};
