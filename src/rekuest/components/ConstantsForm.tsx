import { Form, Formik, FormikHelpers } from "formik";
import { Maybe } from "graphql/jsutils/Maybe";
import { useState } from "react";
import * as Yup from "yup";
import { notEmpty } from "../../floating/utils";
import { withRekuest } from "../RekuestContext";
import { PortFragment, PortKind, useAssignNodeQuery } from "../api/graphql";
import { ChangeSubmitHelper } from "../ui/helpers/ChangeSubmitter";
import { WidgetRegistry } from "../widgets/registry";
import { PortOptions } from "../widgets/types";
import { useWidgetRegistry } from "../widgets/widget-context";

export type ConstantsFormProps = {
  node: string;
  omit?: string[];
  hide?: string[];
  disable?: string[];
  autoSubmit: boolean;
  children?: React.ReactNode;
  initial?: { [key: string]: any };
  onSubmit?: (
    values_as_array: any[],
    values_as_dict: { [key: string]: any },
    formikHelpers: FormikHelpers<any>
  ) => Promise<void>;
};

export const portToWidget = (
  port: Maybe<PortFragment>,
  widgetRegistry?: WidgetRegistry,
  portOptions: PortOptions = { disable: false }
): React.ReactNode => {
  if (!widgetRegistry) {
    return <> No Widget Registry</>;
  }
  if (!port) {
    return <> No Port ...</>;
  }

  let Widget = widgetRegistry.getInputWidgetForPort(port);

  return (
    <Widget
      port={port}
      widget={port?.assignWidget}
      ward_registry={widgetRegistry.ward_registry}
      options={portOptions}
    />
  );
};

// helper for yup transform function
function emptyStringToNull(value: any, originalValue: any) {
  console.log(value, originalValue);
  if (typeof originalValue === "string" && originalValue === "") {
    return null;
  }
  return value;
}

export const port_to_validation = (port: PortFragment): Yup.AnySchema => {
  let baseType;
  switch (port?.kind) {
    case PortKind.String:
      baseType = Yup.string().typeError("Please enter a string");
      break;
    case PortKind.Int:
      baseType = Yup.number()
        .integer("Please enter a valid integer")
        .typeError(`Please enter a valid integer`)
        .transform((v) => (v === "" || Number.isNaN(v) ? null : v));
      break;
    case PortKind.Float:
      baseType = Yup.number()
        .transform((v) => (v === "" || Number.isNaN(v) ? null : v))
        .typeError(`Please enter a valid number`);
      break;
    case PortKind.Structure:
      baseType = Yup.string().typeError(`Please select a ${port.identifier}`);
      break;
    case PortKind.Bool:
      baseType = Yup.boolean().typeError("Please select true or false");
      break;
    case PortKind.Dict:
      baseType = Yup.object().typeError("Please provide a valid dictionary");
      break;
    case PortKind.List:
      baseType = port.child
        ? Yup.array()
            .of(port_to_validation(port?.child as unknown as PortFragment))
            .typeError("Please provide a valid list")
        : Yup.string();
      break;
    default:
      baseType = Yup.string();
      break;
  }
  if (port.nullable) {
    baseType = baseType.nullable("Please provide a value");
  }

  return baseType;
};

export const validationSchemaBuilder = (
  args: (PortFragment | undefined | null)[]
) => {
  const schema: { [key: string]: any } = {};
  console.log(args);
  args.reduce((prev, curr) => {
    if (curr) {
      prev[curr?.key] = port_to_validation(curr);
      return prev;
    }
    return prev;
  }, schema);
  return Yup.object(schema);
};

export const GroupRender = ({
  group,
  disable,
}: {
  group: { key: string; ports: PortFragment[]; hidden?: boolean | null };
  disable?: string[];
}) => {
  const [hidden, setHidden] = useState(group.hidden || false);

  const { registry } = useWidgetRegistry();

  return (
    <>
      {group.ports && group.ports.length > 0 && (
        <div
          className={
            group.key != "ungrouped"
              ? "border border-1 border-slate-600 p-2 rounded gap-2 flex-1"
              : "gap-2"
          }
        >
          {group.key != "ungrouped" && (
            <div
              className="text-lg font-semibold"
              onClick={() => setHidden(!hidden)}
            >
              {group?.key}
            </div>
          )}
          {!hidden &&
            group?.ports?.map((port, index) => (
              <div key={index}>
                {portToWidget(port, registry, {
                  disable:
                    disable && disable.includes(port?.key || "fakekey")
                      ? true
                      : false,
                })}
              </div>
            ))}
        </div>
      )}
    </>
  );
};

const ConstantsForm: React.FC<ConstantsFormProps> = ({
  node,
  initial,
  onSubmit,
  autoSubmit,
  children,
  hide,
  disable,
  omit,
}) => {
  const { data } = withRekuest(useAssignNodeQuery)({
    variables: { id: node },
    fetchPolicy: "cache-and-network",
  });

  console.log("NODE", data);
  let initialValues = {
    ...data?.node?.args?.reduce((result: any, port) => {
      result[port?.key || "test"] = port?.default;
      return result;
    }, {}),
    ...initial,
  };

  let unsetArgs =
    data?.node?.args?.filter(
      (arg) => !omit || !omit.includes(arg?.key || "fosinosinoiens")
    ) || [];

  let groups = unsetArgs.filter(notEmpty).reduce((prev, curr) => {
    if (curr?.groups) {
      for (let index in curr?.groups) {
        let group = curr?.groups[index];
        if (group) {
          if (!prev[group]) {
            prev[group] = [];
          }
          prev[group].push(curr);
        }
      }
    } else {
      if (!prev["ungrouped"]) {
        prev["ungrouped"] = [];
      }
      prev["ungrouped"].push(curr);
    }
    return prev;
  }, {} as { [key: string]: PortFragment[] });

  let portGroups = data?.node?.portGroups || [];

  let mappedPortGroups = portGroups.filter(notEmpty).map((group) => ({
    ...group,
    ports: groups[group.key],
  }));

  let mappedPortGroupsWithUngrouped = [
    {
      key: "ungrouped",
      hidden: false,
      ports: groups["ungrouped"],
    },
    ...mappedPortGroups,
  ];

  const schema = validationSchemaBuilder(unsetArgs);

  return (
    <Formik<{ [key: string]: any }>
      enableReinitialize
      initialValues={initialValues}
      onSubmit={async (values, formikHelpers) => {
        values = schema.cast(values);
        let set_values = unsetArgs.map((arg) => values[arg?.key || "test"]);
        console.log(values, set_values);
        onSubmit && (await onSubmit(set_values, values, formikHelpers));
      }}
      validationSchema={schema}
      validateOnBlur
      validateOnChange
      validateOnMount
    >
      {(formikProps) => (
        <Form>
          {autoSubmit && <ChangeSubmitHelper debounce={500} />}
          <div className="grid grid-cols-1 @xl:grid-cols-2 @2xl:grid-cols-3 gap-4 w-full">
            {mappedPortGroupsWithUngrouped.map((group, index) => (
              <GroupRender key={index} group={group} disable={disable} />
            ))}
          </div>
          {children && children}
        </Form>
      )}
    </Formik>
  );
};

export { ConstantsForm };
