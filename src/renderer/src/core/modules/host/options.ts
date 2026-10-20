import type { ApolloClient } from "@apollo/client";
import type { DescriptorConstraint } from "@/core/ports/engine/constraints";

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
  /**
   * The source narrows a listing to an action input's descriptor constraints
   * (`args.requires`, handed on unchanged). A source without it is never
   * handed any, and its picker shows none as chips.
   */
  honoursRequires?: boolean;
  search: (
    client: ApolloClient<any>,
    args: { search?: string; values?: string[]; requires?: DescriptorConstraint[] },
  ) => Promise<StructureOption[]>;
};
