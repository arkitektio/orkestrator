import type { OptionSource } from "@/core/modules/host/options";
import {
  AppsDocument,
  type AppsQuery,
  type AppsQueryVariables,
  ListDevicesDocument,
  type ListDevicesQuery,
  type ListDevicesQueryVariables,
  UserOptionsDocument,
  type UserOptionsQuery,
  type UserOptionsQueryVariables,
} from "./api/graphql";

/** How many options a typed search offers. */
const SEARCH_LIMIT = 20;

/** Lok's models as options for pickers elsewhere (an `optionSources` builtin). */
export const LOK_OPTION_SOURCES: OptionSource[] = [
  {
    identifier: "@lok/user",
    service: "lok",
    search: async (client, { search, values }) => {
      const { data } = await client.query<UserOptionsQuery, UserOptionsQueryVariables>({
        query: UserOptionsDocument,
        variables: { search: search || undefined, values: values?.length ? values : undefined },
      });
      return data?.options ?? [];
    },
  },
  {
    identifier: "@lok/app",
    by: "identifier",
    service: "lok",
    search: async (client, { search, values }) => {
      // Known values are looked up by identifier, a typed search by
      // `AppFilter.search` (name or identifier, case-insensitive): both on the server.
      const { data } = await client.query<AppsQuery, AppsQueryVariables>({
        query: AppsDocument,
        variables: values?.length
          ? { filters: { identifiers: values }, pagination: { limit: values.length } }
          : { filters: search ? { search } : undefined, pagination: { limit: SEARCH_LIMIT } },
      });
      return (data?.apps ?? []).map((app) => ({ value: String(app.identifier), label: String(app.identifier) }));
    },
  },
  {
    identifier: "@lok/device",
    by: "nodeId",
    service: "lok",
    search: async (client, { search, values }) => {
      // Known values are looked up by device id, a typed search by
      // `DeviceFilter.search` (case-insensitive): both on the server.
      const { data } = await client.query<ListDevicesQuery, ListDevicesQueryVariables>({
        query: ListDevicesDocument,
        variables: values?.length
          ? { filters: { deviceIds: values }, pagination: { limit: values.length } }
          : { filters: search ? { search } : undefined, pagination: { limit: SEARCH_LIMIT } },
      });
      return (data?.devices ?? []).map((device) => ({
          value: device.nodeId,
          label: device.name || `Unnamed device (${device.nodeId})`,
        }));
    },
  },
];
