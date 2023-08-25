import React from "react";
import { useNavigate } from "react-router";
import { MikroRepresentation, MikroStage } from "../../linker";
import { withMikro } from "../../mikro/MikroContext";
import {
  useSearchableRepresentationsLazyQuery,
  useSearchableStagesLazyQuery,
} from "../../mikro/api/graphql";
import {
  Extension,
  useExtension,
} from "../../providers/command/GeneralMenuContext";
import { queryfiltered } from "./GeneralMenu";

export interface NavigationActionsProps {}

export const SearchActions: React.FC<NavigationActionsProps> = ({}) => {
  const [searchRepresentation] = withMikro(
    useSearchableRepresentationsLazyQuery
  )();

  const [searchableStages] = withMikro(useSearchableStagesLazyQuery)();

  const navigate = useNavigate();

  const handler: Extension = {
    key: "globalsearch",
    label: "Search Data...",
    filter: async ({ query, modifiers }) => {
      if (modifiers.find((x) => x.key == "images")) {
        const { data } = await searchRepresentation({
          variables: { name: query, limit: 10 },
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
      }

      if (modifiers.find((x) => x.key == "stages")) {
        const { data } = await searchableStages({
          variables: { search: query, limit: 10 },
        });

        const results = data?.mystages?.map((stage) => {
          return {
            extension: "globalsearch",
            key: "stage-" + stage?.id,
            label: stage?.name || "unknown",
            params: {
              type: "stage",
              stage: stage?.id,
            },
            description:
              "Navigate to " +
              stage?.name +
              " created at " +
              new Date(stage?.createdAt).toLocaleDateString(),
          };
        });

        return queryfiltered(results, query);
      }

      return queryfiltered(
        [
          {
            extension: "modify",
            label: "Images",
            key: "images",
            params: {
              type: "images",
            },
            description: "Enter Image search mode",
          },
          {
            extension: "modify",
            label: "Stages",
            key: "stages",
            params: {
              type: "stages",
            },
            description: "Enter Stage search mode",
          },
        ],
        query
      );
    },
    do: async (action) => {
      switch (action.params?.type) {
        case "images":
          navigate(
            MikroRepresentation.linkBuilder(action.params?.representation)
          );

          break;
        case "stage":
          navigate(MikroStage.linkBuilder(action.params?.stage));
      }
    },
  };

  useExtension(handler);

  return <></>;
};
