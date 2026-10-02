import type { OptionSource } from "@/core/modules/host/options";
import {
  GetArrayDatasetsDocument,
  type GetArrayDatasetsQuery,
  type GetArrayDatasetsQueryVariables,
  GetScenesDocument,
  type GetScenesQuery,
  type GetScenesQueryVariables,
  Ordering,
} from "./api/graphql";

const PAGE = { limit: 25 };

/** By id when the picker resolves what it already holds, by text otherwise. */
const filtersFor = ({ search, values }: { search?: string; values?: string[] }) =>
  values?.length ? { ids: values } : search ? { search } : undefined;

/**
 * Mikro's models as options for pickers elsewhere (an `optionSources` builtin).
 * `no-cache`: a picker is opened to find what was just made, and the list
 * fields merge pages by offset, which a search result is not.
 */
export const MIKRO_OPTION_SOURCES: OptionSource[] = [
  {
    identifier: "@mikro/arraydataset",
    service: "mikro",
    search: async (client, args) => {
      const { data } = await client.query<GetArrayDatasetsQuery, GetArrayDatasetsQueryVariables>({
        query: GetArrayDatasetsDocument,
        variables: {
          filters: filtersFor(args),
          pagination: PAGE,
          ordering: [{ createdAt: Ordering.Desc }],
        },
        fetchPolicy: "no-cache",
      });
      return (data?.arrayDatasets ?? []).map((dataset) => ({
        value: dataset.id,
        label: dataset.name || `Unnamed dataset (${dataset.id})`,
      }));
    },
  },
  {
    identifier: "@mikro/scene",
    service: "mikro",
    search: async (client, args) => {
      const { data } = await client.query<GetScenesQuery, GetScenesQueryVariables>({
        query: GetScenesDocument,
        variables: { filters: filtersFor(args), pagination: PAGE, ordering: [{ id: Ordering.Desc }] },
        fetchPolicy: "no-cache",
      });
      return (data?.scenes ?? []).map((scene) => ({
        value: scene.id,
        label: scene.name || `Unnamed scene (${scene.id})`,
      }));
    },
  },
];
