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

const matches = (term: string | undefined, ...texts: (string | null | undefined)[]) =>
  !term || texts.some((text) => text?.toLowerCase().includes(term.toLowerCase()));

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
      // Known values are looked up by identifier on the server. A search reads
      // the identifier, which `AppFilter.search` (the name, case-sensitive)
      // does not, so it still runs over the list here.
      const { data } = await client.query<AppsQuery, AppsQueryVariables>({
        query: AppsDocument,
        variables: values?.length ? { filters: { identifiers: values }, pagination: { limit: values.length } } : {},
      });
      return (data?.apps ?? [])
        .map((app) => String(app.identifier))
        .filter((identifier) => (values?.length ? true : matches(search, identifier)))
        .map((identifier) => ({ value: identifier, label: identifier }));
    },
  },
  {
    identifier: "@lok/device",
    by: "nodeId",
    service: "lok",
    search: async (client, { search, values }) => {
      // Known values are looked up by device id on the server. A search reads
      // the device id too, which `DeviceFilter.search` (the name,
      // case-sensitive) does not, so it still runs over the list here.
      const { data } = await client.query<ListDevicesQuery, ListDevicesQueryVariables>({
        query: ListDevicesDocument,
        variables: values?.length ? { filters: { deviceIds: values }, pagination: { limit: values.length } } : {},
      });
      return (data?.devices ?? [])
        .filter((device) => (values?.length ? true : matches(search, device.name, device.nodeId)))
        .map((device) => ({
          value: device.nodeId,
          label: device.name || `Unnamed device (${device.nodeId})`,
        }));
    },
  },
];
