import { ListSearchField, SearchOptions } from "@/components/fields/ListSearchField";
import { notEmpty } from "@/lib/utils";
import { ChoiceAssignWidgetFragment } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";
import { useCallback } from "react";

type Row = { __value: string };

const toRows = (values: string[]): Row[] => values.map((value) => ({ __value: value }));
const fromRows = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.map((row) => String((row as Row)?.__value ?? "")).filter((v) => v !== "")
    : undefined;

/**
 * A LIST port whose item port carries a choice widget: a multi-select over the
 * item's choices, stored as the `[{ __value }]` rows the list schema expects.
 */
export const ListChoicesWidget = (
  props: InputWidgetProps<ChoiceAssignWidgetFragment>,
) => {
  // Choices live on the item port; the widget only selects the presentation.
  const choices = props.port.children?.at(0)?.choices ?? props.port.choices ?? [];

  const search = useCallback(
    async (searching: SearchOptions) => {
      const all = choices.filter(notEmpty);
      if (searching.search) {
        return all.filter((c) => c.label.startsWith(searching.search || ""));
      }
      if (searching.values != undefined) {
        return all.filter((c) => searching.values?.includes(c.value));
      }
      return all;
    },
    [choices],
  );

  return (
    <ListSearchField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      search={search}
      description={props.port.description || undefined}
      noOptionFoundPlaceholder="No options found"
      commandPlaceholder={props.widget?.placeholder || "Search..."}
      toFieldValue={toRows}
      fromFieldValue={fromRows}
    />
  );
};
