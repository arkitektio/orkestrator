import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { Form } from "@/core/ui/form";
import {
  useScheduleActionOptionsLazyQuery,
  useTriggerActionOptionsLazyQuery,
} from "@/rekuest/api/graphql";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";

/**
 * Pick the action a schedule or trigger runs. With `identifier`, only
 * actions taking a structure of that identifier are offered (a trigger
 * hands them the signalled object).
 */
export const ActionPicker = ({
  identifier,
  onPick,
}: {
  identifier?: string;
  onPick: (action: string) => void;
}) => {
  const form = useForm<{ action?: string }>({ defaultValues: {} });
  const [searchAny] = useScheduleActionOptionsLazyQuery();
  const [searchForStructure] = useTriggerActionOptionsLazyQuery();
  const searchScoped = useCallback(
    (x: { variables: { search?: string; values?: string[] } }) =>
      searchForStructure({ variables: { ...x.variables, identifier: identifier ?? "" } }),
    [searchForStructure, identifier],
  );

  const picked = form.watch("action");
  useEffect(() => {
    if (picked) onPick(picked);
  }, [picked, onPick]);

  return (
    <Form {...form}>
      {identifier ? (
        <GraphQLSearchField
          name="action"
          label="Run"
          placeholder="Choose an action"
          description={`Actions that take a ${identifier}`}
          searchQuery={searchScoped}
        />
      ) : (
        <GraphQLSearchField
          name="action"
          label="Run"
          placeholder="Choose an action"
          searchQuery={searchAny}
        />
      )}
    </Form>
  );
};
