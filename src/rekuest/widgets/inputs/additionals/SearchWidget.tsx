import React from "react";
import {
  ListSearchInput,
  SearchInput,
} from "../../../../components/forms/fields/SearchInput";
import { SearchWidgetFragment } from "../../../api/graphql";
import { InputWidgetProps } from "../../types";
import { useWidgetRegistry } from "../../widget-context";

const people = [
  { id: 1, name: "Durward Reynolds" },
  { id: 2, name: "Kenton Towne" },
  { id: 3, name: "Therese Wunsch" },
  { id: 4, name: "Benedict Kessler" },
  { id: 5, name: "Katelyn Rohan" },
];

export type Person = (typeof people)[number];

export const SearchWidget: React.FC<InputWidgetProps<SearchWidgetFragment>> = ({
  port,
  widget,
  options,
}) => {
  if (!widget?.ward)
    return (
      <>This port is not usable with this widget {JSON.stringify(widget)}</>
    );
  const ward = useWidgetRegistry().registry?.ward_registry.getWard(widget.ward);

  if (!ward)
    return (
      <div>
        {" "}
        No ward specified for rekuest ward: {widget.ward}. Please register a
        Ward that supports "search"
      </div>
    );

  if (!ward.search) {
    console.log("ward", ward);
    return <div> Ward found but does not support search</div>;
  }

  if (!widget?.query)
    return (
      <div>
        {" "}
        There is no widget query specified for this port. Please specify a
        Widget and a query for this port.
      </div>
    );

  const searchFunction = (search?: string, initialValue?: string[]) => {
    let query = widget.query;
    if (ward.search)
      try {
        console.log("searching", search, initialValue);
        return ward
          .search({
            query: query as string,
            variables: { search: search, values: initialValue },
          })
          .then((result) => result.options || []);
      } catch (e) {
        return Promise.reject("Malformed Query" + e);
      }
    return Promise.reject("No search function availabl");
  };

  return (
    <SearchInput
      name={port.key || "fake"}
      searchFunction={searchFunction}
      label={port.label || port.key}
      description={port.description || ""}
    />
  );
};

export const ListSearchWidget: React.FC<
  InputWidgetProps<SearchWidgetFragment>
> = ({ port, widget, options }) => {
  if (!widget?.ward)
    return (
      <>This port is not usable with this widget {JSON.stringify(widget)}</>
    );

  const widgetRegistry = useWidgetRegistry();

  const ward = widgetRegistry.registry?.ward_registry.getWard(widget.ward);

  if (!ward?.search)
    return (
      <div>
        {" "}
        No ward specified for this {widget.ward}. Please register a Ward that
        supports "search"
      </div>
    );

  if (!widget?.query)
    return (
      <div>
        {" "}
        There is no widget query specified for this port. Please specify a
        Widget and a query for this port.
      </div>
    );

  const searchFunction = (search?: string, initialValue?: string[]) => {
    let query = widget.query;
    if (ward.search)
      try {
        console.log("searching", search, initialValue);
        return ward
          .search({
            query: query as string,
            variables: { search: search, values: initialValue },
          })
          .then((result) => result.options || []);
      } catch (e) {
        return Promise.reject("Malformed Query" + e);
      }
    return Promise.reject("No search function availabl");
  };

  return (
    <ListSearchInput
      name={port.key || "fake"}
      searchFunction={searchFunction}
      label={port.label || port.key}
      description={port.description || ""}
    />
  );
};
