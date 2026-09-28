import { SearchField, SearchOptions } from "@/core/forms/SearchField";
import { notEmpty } from "@/core/util/utils";
import { ChoiceAssignWidgetFragment } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";
import { useCallback } from "react";

export const ChoicesWidget = (
  props: InputWidgetProps<ChoiceAssignWidgetFragment>,
) => {
  // Choices live on the port; the widget only selects the presentation.
  const choices = props.port.choices || [];

  const search = useCallback(
    async (searching: SearchOptions) => {
      if (searching.search) {
        return choices
          .filter(notEmpty)
          .filter((c) => c.label.startsWith(searching.search || ""));
      }
      if (searching.values) {
        return choices
          .filter(notEmpty)
          .filter((c) => searching.values?.includes(c.value));
      }
      return choices.filter(notEmpty);
    },
    [choices],
  );

  return (
    <SearchField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      search={search}
      description={props.port.description || undefined}
      noOptionFoundPlaceholder="No options found"
      commandPlaceholder={props.widget?.placeholder || "Search..."}
    />
  );
};
