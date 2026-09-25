import { useCallback } from "react";
import { SearchField } from "./SearchField";
import { FieldProps } from "./types";

export type Option = {
  label: string;
  value: string;
  description?: string;
};

export const ChoicesField = (props: FieldProps & { options: Option[] }) => {
  const options = props.options;
  const search = useCallback(
    async ({
      search,
      values,
    }: {
      search?: string;
      values?: (string | number)[];
    }) => {
      return options.filter((op) => {
        if (values) return values.includes(op.value);
        if (search) return op.label.includes(search);
        if (!search) return true;
        return false;
      });
    },
    [options],
  );

  return <SearchField search={search} {...props} />;
};
