import { StringField } from "@/components/fields/StringField";
import { ContainerGrid } from "@/components/layout/ContainerGrid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { ArgChildPortFragment, PortKind } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";
import { Plus, X } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { ChildWidget } from "../ChildWidget";

export const SideBySideWidget = ({
  valuetype,
  path,
  bound,
  options,
}: InputWidgetProps & { valuetype: ArgChildPortFragment }) => {
  const control = useFormContext().control;
  const name = pathToName(path);

  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  return (
    <div className="@container">
      <ContainerGrid minItemWidth={320}>
        {fields.map((item, index) => (
          <Card
            key={item.id}
            className="p-3 relative overflow-visible focus-within:z-50"
          >
            <StringField
              name={`${name}.${index}.__key`}
              label="The Key"
              description="The key of this entry"
            />
            <ChildWidget
              child={valuetype}
              pathKey={`${name}.${index}.__value`}
              parentKind={PortKind.Dict}
              bound={bound}
              options={options}
            />
            <Button
              variant="outline"
              size={"icon"}
              className="absolute top-0 right-0 mr-2 mt-2"
              onClick={(e) => { remove(index); e.preventDefault(); }}
            >
              <X />
            </Button>
          </Card>
        ))}
        <TooltipButton
          variant="outline"
          size="icon"
          onClick={(e) => { append({ __key: "", __value: undefined }); e.preventDefault(); }}
          tooltip="Add new item"
        >
          <Plus />
        </TooltipButton>
      </ContainerGrid>
    </div>
  );
};

export const DictWidget = (props: InputWidgetProps) => {
  if (!props.port.children) {
    return <>Faulty port config. no children</>;
  }

  if (props.port.children.length != 1) {
    return (
      <>
        Faulty port config. not the adequat amount of children. Expected 1 go{" "}
        {props.port.children.length}
      </>
    );
  }

  const child = props.port.children?.at(0);

  if (!child) {
    return <>Faulty port config. no child</>;
  }

  return <SideBySideWidget {...props} valuetype={child} />;
};
