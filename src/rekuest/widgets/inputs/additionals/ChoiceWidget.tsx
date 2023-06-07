import React from "react";
import {
  ListSearchInput,
  SearchInput,
} from "../../../../components/forms/fields/SearchInput";
import { notEmpty } from "../../../../floating/utils";
import { ChoiceWidgetFragment, PortKind } from "../../../api/graphql";
import { InputWidgetProps } from "../../types";

const ChoiceWidget: React.FC<InputWidgetProps<ChoiceWidgetFragment>> = ({
  port,
  widget,
  options,
}) => {
  const searchFunction = async (search?: string, initialValue?: string[]) => {
    if (initialValue) {
      return (
        widget?.choices
          ?.filter((v) => initialValue.includes(v?.value))
          .filter(notEmpty)
          .map((v) => ({ label: v?.label || "", value: v?.value })) || []
      );
    }
    if (search) {
      return (
        widget?.choices
          ?.filter(
            (v) =>
              v?.label.toUpperCase().includes(search.toUpperCase()) ||
              v?.value.toUpperCase().includes(search.toUpperCase())
          )
          .filter(notEmpty)
          .map((v) => ({ label: v?.label, value: v?.value })) || []
      );
    } else return widget?.choices?.filter(notEmpty) || [];
  };

  return (
    <>
      {port.kind == PortKind.List ? (
        <ListSearchInput
          searchFunction={searchFunction}
          name={port.key || "fake"}
          label={port.label || port.key}
          description={port.description || ""}
        />
      ) : (
        <SearchInput
          searchFunction={searchFunction}
          name={port.key || "fake"}
          label={port.label || port.key}
          description={port.description || ""}
        />
      )}
    </>
  );
};

export { ChoiceWidget };
