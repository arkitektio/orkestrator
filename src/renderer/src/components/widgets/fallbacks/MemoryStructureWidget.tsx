import { SearchField, SearchOptions } from "@/components/fields/SearchField";
import { useSearchMemoryDrawerLazyQuery } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";
import { useCallback } from "react";

const structureKey = (value: unknown): string | undefined =>
  value && typeof value === "object"
    ? String((value as { object?: unknown }).object ?? "")
    : undefined;

export const MemoryStructureWidget = (props: InputWidgetProps) => {
  // Hooks run unconditionally; the unbound notice is decided afterwards.
  const [searchD] = useSearchMemoryDrawerLazyQuery();
  const bound = props.bound;
  const identifier = props.port.identifier;

  const search = useCallback(
    async (searching: SearchOptions) => {
      const w = await searchD({
        variables: {
          search: searching.search,
          values: searching.values?.map((v) => v.toString()),
          implementation: bound,
        },
      });
      return w.data?.options || [];
    },
    [searchD, bound],
  );

  const toFieldValue = useCallback(
    (option: string) => ({ __identifier: identifier, object: option }),
    [identifier],
  );

  if (!bound) {
    return (
      <div>
        This widget makes only sense if you use it on a bound instance, because
        it depends on specific app state
      </div>
    );
  }

  return (
    <SearchField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      search={search}
      description={props.port.description || undefined}
      noOptionFoundPlaceholder="No options found"
      commandPlaceholder="Search..."
      toFieldValue={toFieldValue}
      fieldKey={structureKey}
    />
  );
};
