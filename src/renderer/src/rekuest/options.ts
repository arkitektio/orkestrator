import type { OptionSource } from "@/core/modules/host/options";
import {
  AgentOptionsDocument,
  type AgentOptionsQuery,
  type AgentOptionsQueryVariables,
  type DescriptorOperator,
} from "./api/graphql";

/**
 * Rekuest's models as options for pickers (an `optionSources` builtin). An
 * agent input hands its `requires` on: a supervisor's actions take only the
 * agents that name it (`@rekuest/supervisor`).
 */
export const REKUEST_OPTION_SOURCES: OptionSource[] = [
  {
    identifier: "@rekuest/agent",
    service: "rekuest",
    honoursRequires: true,
    search: async (client, { search, values, requires }) => {
      const { data } = await client.query<AgentOptionsQuery, AgentOptionsQueryVariables>({
        query: AgentOptionsDocument,
        variables: {
          search: search || undefined,
          values: values?.length ? values : undefined,
          requires: requires?.length
            ? requires.map(({ key, operator, value }) => ({
                key,
                operator: operator as DescriptorOperator,
                value,
              }))
            : undefined,
        },
      });
      return data?.options ?? [];
    },
  },
];
