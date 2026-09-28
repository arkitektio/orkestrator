import type { ApolloClient } from "@apollo/client";

export type StructureOption = { value: string; label: string };

/**
 * How a module answers "which of your X are there?" for pickers in other
 * modules' UI (a user chip in kraph, an app filter in rekuest), as a plain
 * function over its own client: the host resolves the client, so the
 * picker imports nothing from the module.
 */
export type OptionSource = {
  identifier: string;
  /** Which key the option values are (see DisplayWidgetProps.by); absent = the model's id. */
  by?: string;
  /** The service key whose client answers; "lok" is the session's own service. */
  service: string;
  search: (
    client: ApolloClient<any>,
    args: { search?: string; values?: string[] },
  ) => Promise<StructureOption[]>;
};
