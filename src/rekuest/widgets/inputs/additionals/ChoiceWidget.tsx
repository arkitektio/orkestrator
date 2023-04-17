import React from "react";
import {
  ListSearchField,
  SearchField,
} from "../../../../components/forms/fields/SearchInput";
import { ChoiceWidgetFragment, PortKind } from "../../../api/graphql";
import { InputWidgetProps } from "../../types";

const ChoiceWidget: React.FC<InputWidgetProps<ChoiceWidgetFragment>> = ({
  port,
  widget,
  options,
}) => {
  return (
    <>
      {port.kind == PortKind.List ? (
        <ListSearchField
          disabled={options?.disable}
          searchFunction={async () => widget?.choices || []}
          name={port.key || "fake"}
        />
      ) : (
        <SearchField
          disabled={options?.disable}
          searchFunction={async () => widget?.choices || []}
          name={port.key || "fake"}
        />
      )}
    </>
  );
};

export { ChoiceWidget };
