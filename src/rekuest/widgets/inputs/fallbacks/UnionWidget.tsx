import { Field, FieldProps, Form, Formik } from "formik";
import React from "react";
import { Alert } from "../../../../components/forms/Alert";
import { CarouselInputField } from "../../../../components/forms/fields/carousel_inputs";
import { notEmpty } from "../../../../floating/utils";
import {
  ChildPortFragment,
  ChildPortNestedFragment,
  PortKind,
} from "../../../api/graphql";
import { ChangeSubmitHelper } from "../../../ui/helpers/ChangeSubmitter";
import { InputWidgetProps } from "../../types";
import { useWidgetRegistry } from "../../widget-context";

export type UnionValue = {
  use: number;
  value: any;
};

const portToLabel = (
  port: ChildPortFragment | ChildPortNestedFragment
): string => {
  if (port.kind == PortKind.Structure)
    return port.identifier || "Unkonwn Structure";
  if (port.kind == PortKind.List)
    return port.child
      ? "List of " + portToLabel(port?.child) || "Unknown List"
      : "Unknown List";
  if (port.kind == PortKind.Union)
    return (
      "Union of " +
      port?.variants
        ?.filter(notEmpty)
        .map((x) => (x ? portToLabel(x) : "Unkown"))
        .join(", ")
    );
  if (port.kind == PortKind.Bool) return "Bool";
  if (port.kind == PortKind.Float) return "Float";
  if (port.kind == PortKind.Int) return "Int";
  if (port.kind == PortKind.String) return "String";
  if (port.kind == PortKind.Date) return "Date";
  return "Unknown";
};
export const RenderedSubWidget = ({
  variant,
  portKey,
}: {
  variant: ChildPortFragment | null | undefined;
  portKey: string;
}) => {
  const { registry } = useWidgetRegistry();
  if (!variant) {
    return <> No variant</>;
  }

  const port = { ...variant, key: portKey, nullable: false, label: "Item" };

  if (!registry) {
    return <> No Widget Registry</>;
  }
  if (!port) {
    return <> No Port ...</>;
  }

  console.log(port.key);

  let Widget = registry.getInputWidgetForPort(port); //TODO: Make correct child port

  return <Widget port={port} widget={port?.assignWidget} />;
};

const UnionWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  if (!port.key) return <> Failure Key not specified </>;

  if (!port.variants) return <> Variants not specified </>;
  if (port.variants.length == 0) return <> Variants amount to zero </>;
  if (port.variants.length == 1)
    return <> Variants amount to one. Union makes no sense </>;

  return (
    <Field name={port.key}>
      {({
        field,
        form, // { name, value, onChange, onBlur }// also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
        meta,
      }: FieldProps) => (
        <>
          <Formik
            initialValues={field.value || { use: null, value: null }}
            onSubmit={(values) => {
              console.log("Will set", values);
              form.setFieldValue(field.name, values);
            }}
          >
            {({ values, setFieldValue }) => (
              <Form>
                <ChangeSubmitHelper debounce={500} />
                {port.variants && (
                  <CarouselInputField
                    label={"Choose"}
                    options={port.variants
                      .filter(notEmpty)
                      .map((x, i) => ({ label: portToLabel(x), value: i }))}
                    name="use"
                    labelClassName="text-white"
                    optionBuilder={(option) => (
                      <div className="flex-shrink"> {option.label}</div>
                    )}
                    description="Choose the correct type"
                  />
                )}
                {values.use != null && (
                  <RenderedSubWidget
                    variant={port?.variants?.at(values.use)}
                    portKey={"value"}
                  />
                )}
              </Form>
            )}
          </Formik>
          {meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </>
      )}
    </Field>
  );
};

export { UnionWidget };
