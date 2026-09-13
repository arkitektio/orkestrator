import { ContainerGrid } from "@/components/layout/ContainerGrid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { ArgChildPortFragment, PortKind } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import {
  pathToName,
  portToDefaults,
  portToMinItemWidth,
} from "@/rekuest/widgets/utils";
import { Plus, X } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { ChildWidget } from "../ChildWidget";
import { ListChoicesWidget } from "../custom/ListChoicesWidget";
import { ListSearchWidget } from "../custom/ListSearchWidget";

export const SideBySideWidget = ({
  port,
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
      <div>{port.label || port.key}</div>
      <div>
        <ContainerGrid minItemWidth={portToMinItemWidth(valuetype)}>
          {fields.map((item, index) => (
            <Card
              key={item.id}
              className="p-3 relative overflow-visible focus-within:z-50"
            >
              <ChildWidget
                child={valuetype}
                pathKey={`${name}.${index}.__value`}
                parentKind={PortKind.List}
                bound={bound}
                options={options}
              />
              <Button
                variant="outline"
                size={"icon"}
                className="absolute top-0 right-0 mr-2 mt-2"
                onClick={(e) => { remove(index); e.preventDefault() }}
              >
                <X />
              </Button>
            </Card>
          ))}
          <TooltipButton
            variant="outline"
            size="icon"
            onClick={(e) => { append({ __value: portToDefaults([valuetype], {})[valuetype.key] }); e.preventDefault() }}
            tooltip="Add new item"
          >
            <Plus />
          </TooltipButton>
        </ContainerGrid>
      </div>
    </div>
  );
};

export const ListWidget = (props: InputWidgetProps) => {
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

  if (child?.widget?.__typename == "SearchAssignWidget") {
    return <ListSearchWidget {...props} widget={child.widget} />;
  }

  if (child?.widget?.__typename == "ChoiceAssignWidget") {
    return <ListChoicesWidget {...props} widget={child.widget} />;
  }

  return <SideBySideWidget {...props} valuetype={child} />;
};
