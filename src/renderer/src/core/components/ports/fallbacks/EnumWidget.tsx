import { SearchField, SearchOptions } from "@/core/components/fields/SearchField";
import { notEmpty } from "@/core/lib/utils";
import { InputWidgetProps } from "@/core/lib/ports/types";
import { pathToName } from "@/core/lib/ports/utils";
import { useCallback } from "react";

export const EnumWidget = (
  props: InputWidgetProps,
) => {
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
      commandPlaceholder="Search..."
    />
  );
};
