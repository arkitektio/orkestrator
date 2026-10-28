import { AssignWidgetFragment } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { createElement, useMemo } from "react";
import { CatalogWidget } from "./CatalogWidget";

/** What the port would get without the picker: its search widget, or the id box. */
const PlainWidget = (props: InputWidgetProps) => {
  const { registry } = useWidgetRegistry();
  return createElement(registry.getInputWidgetForPort(props.port, true, false), {
    ...props,
    widget: props.widget as AssignWidgetFragment,
  });
};

/**
 * A structure port drawn by the catalog's `StructurePicker`, the same
 * component an app author names in a CUSTOM widget.
 *
 * A SEARCH widget is a query and a ward, so it becomes the picker's `query`
 * and `schema`, and its dependencies are the data the query's own variables are
 * read from. A port with no widget gets the picker with no query, and the
 * module that owns the structure answers.
 *
 * Its fallback is whatever the port would have got otherwise (the search
 * widget, or the id box), so a catalog without the picker changes nothing.
 */
export const StructurePickerWidget = (props: InputWidgetProps) => {
  const search = props.port.widget?.__typename === "SearchAssignWidget" ? props.port.widget : undefined;
  const query = search?.query;
  const ward = search?.ward;

  const componentProps = useMemo(
    () => [
      { key: "bind", static_value: "value" },
      ...(query && ward
        ? [
            { key: "query", static_value: query },
            { key: "ward", static_value: ward },
          ]
        : []),
    ],
    [query, ward],
  );

  return (
    <CatalogWidget
      {...props}
      component="StructurePicker"
      componentProps={componentProps}
      dependencies={search?.dependencies}
      fallback={<PlainWidget {...props} />}
    />
  );
};
