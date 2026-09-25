import type { OptionSource } from "@/lib/module-host/options";
import {
  AppsDocument,
  type AppsQuery,
  ListDevicesDocument,
  type ListDevicesQuery,
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
      const { data } = await client.query<AppsQuery>({ query: AppsDocument });
      return (data?.apps ?? [])
        .map((app) => String(app.identifier))
        .filter((identifier) => (values?.length ? values.includes(identifier) : matches(search, identifier)))
        .map((identifier) => ({ value: identifier, label: identifier }));
    },
  },
  {
    identifier: "@lok/device",
    by: "nodeId",
    service: "lok",
    search: async (client, { search, values }) => {
      const { data } = await client.query<ListDevicesQuery>({ query: ListDevicesDocument });
      return (data?.devices ?? [])
        .filter((device) =>
          values?.length ? values.includes(device.nodeId) : matches(search, device.name, device.nodeId),
        )
        .map((device) => ({
          value: device.nodeId,
          label: device.name || `Unnamed device (${device.nodeId})`,
        }));
    },
  },
];
