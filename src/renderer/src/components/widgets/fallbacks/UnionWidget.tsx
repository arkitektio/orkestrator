import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { notEmpty } from "@/lib/utils";
import { ArgChildPortFragment, PortKind } from "@/rekuest/api/graphql";
import { InputWidgetProps, PortOptions } from "@/rekuest/widgets/types";
import { pathToName, portToLabel } from "@/rekuest/widgets/utils";
import React, { useMemo } from "react";
import {
  ControllerRenderProps,
  FieldValues,
  useFormContext,
} from "react-hook-form";
import { ChildWidget } from "../ChildWidget";

const SubForm = ({
  variants,
  field,
  name,
  bound,
  options,
}: {
  variants: ArgChildPortFragment[];
  field: ControllerRenderProps<FieldValues, string>;
  name: string;
  bound?: string;
  options?: PortOptions;
}) => {
  const form = useFormContext();

  // The value is { __use: "<index>", __value }; __use is a string on the wire.
  const useIndex = field.value?.__use != null ? Number(field.value.__use) : -1;
  const chosenVariant = useIndex >= 0 ? variants[useIndex] : undefined;

  const choices = useMemo(
    () => variants.map((v, i) => ({ label: portToLabel(v), value: i.toString() })),
    [variants],
  );

  return (
    <div className="@container">
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground w-full mb-1">
        {choices.map((c) => (
          <div
            key={c.value}
            className="cursor-pointer inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
            data-state={String(useIndex) === c.value ? "active" : undefined}
            onClick={() =>
              form.setValue(
                name,
                { __use: c.value, __value: undefined },
                // Switching variants changes what is valid; say so right away.
                { shouldValidate: true, shouldDirty: true },
              )
            }
          >
            {c.label}
          </div>
        ))}
      </div>
      {chosenVariant && (
        <ChildWidget
          child={chosenVariant}
          pathKey={`${name}.__value`}
          parentKind={PortKind.Union}
          bound={bound}
          options={options}
        />
      )}
    </div>
  );
};

const UnionWidget: React.FC<InputWidgetProps> = ({ port, path, bound, options }) => {
  const form = useFormContext();
  const name = pathToName(path);
  const variants = useMemo(
    () => (port.children?.filter(notEmpty) ?? []) as ArgChildPortFragment[],
    [port.children],
  );
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{port.label || port.key}</FormLabel>
          <SubForm
            variants={variants}
            field={field}
            name={name}
            bound={bound}
            options={options}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export { UnionWidget };
