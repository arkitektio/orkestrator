import { Form, Formik, FormikHelpers } from "formik";
import { Maybe } from "graphql/jsutils/Maybe";
import { useEffect } from "react";
import { SubmitButton } from "../../components/forms/fields/SubmitButton";
import {
  AssignNodeEventDocument,
  AssignNodeEventSubscription,
  AssignNodeEventSubscriptionVariables,
  ChildPortFragment,
  PortFragment,
  PortKind,
  PortsFragment,
  useAssignNodeQuery,
} from "../api/graphql";
import { ChangeSubmitHelper } from "../ui/helpers/ChangeSubmitter";
import { WidgetRegistry } from "../widgets/registry";
import { useWidgetRegistry } from "../widgets/widget-context";
import * as Yup from "yup";
import { PortOptions } from "../widgets/types";
import { withRekuest } from "../RekuestContext";
import { notEmpty } from "../../floating/utils";

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

export const port_to_validation = (port: PortFragment): Yup.AnySchema => {
  let baseType;
  switch (port?.kind) {
    case PortKind.String:
      baseType = Yup.string().typeError("Please enter a string");
      break;
    case PortKind.Int:
      baseType = Yup.number()
        .integer()
        .typeError(`Please enter a valid integer`);
      break;
    case PortKind.Float:
      baseType = Yup.number().typeError(`Please enter a valid number`);
      break;
    case PortKind.Structure:
      baseType = Yup.string()
        .typeError(`Please select a ${port.identifier}`)
        .test({
          name: "structure",
          test: (value) => !value?.includes(","),
          message: "Please select a valid structure identifier",
        });
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
  console.log(port, baseType);
  let modified =
    port?.nullable || port?.default
      ? baseType.nullable(true)
      : baseType?.required("This port cannot be null");
  return modified;
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
  const { registry } = useWidgetRegistry();

  const { data, subscribeToMore } = withRekuest(useAssignNodeQuery)({
    variables: { id: node },
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    console.log("Subscribing to My Representations");
    const unsubscribe = subscribeToMore<
      AssignNodeEventSubscription,
      AssignNodeEventSubscriptionVariables
    >({
      document: AssignNodeEventDocument,
      variables: { id: node },
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Representation", subscriptionData);
        var data = subscriptionData;
        let newnode = data.data?.nodeEvent;
        return {
          ...prev,
          node: newnode,
        };
      },
    });
    return () => unsubscribe();
  }, []);

  let initialValues = {
    ...data?.node?.args?.reduce((result: any, port) => {
      result[port?.key || "test"] = port?.default;
      return result;
    }, {}),
    ...initial,
  };

  console.log(initialValues);

  let unsetArgs =
    data?.node?.args?.filter(
      (arg) => !omit || !omit.includes(arg?.key || "fosinosinoiens")
    ) || [];

  return (
    <Formik<{ [key: string]: any }>
      enableReinitialize
      initialValues={initialValues}
      onSubmit={async (values, formikHelpers) => {
        let set_values = unsetArgs.map((arg) => values[arg?.key || "test"]);
        onSubmit && (await onSubmit(set_values, values, formikHelpers));
      }}
      validateOnMount={unsetArgs.length == 0}
      validationSchema={validationSchemaBuilder(unsetArgs)}
    >
      {(formikProps) => (
        <Form>
          {autoSubmit && <ChangeSubmitHelper debounce={500} />}
          <div className="mt-2 align-left text-left">
            {unsetArgs && unsetArgs?.length > 0 && (
              <>
                {unsetArgs
                  ?.filter(
                    (arg) =>
                      !hide || !hide.includes(arg?.key || "fosinosinoiens")
                  )
                  .filter(notEmpty)
                  .map((arg, index) => (
                    <div key={index}>
                      <label className="font-light">
                        {arg.label || arg.key}
                      </label>
                      <div className="w-full mt-2 mb-2 relative">
                        {portToWidget(arg, registry, {
                          disable:
                            disable && disable.includes(arg?.key || "fakekey")
                              ? true
                              : false,
                        })}
                      </div>
                      {arg.description && (
                        <div
                          id={`${arg.key}-help`}
                          className="text-xs text-gray-600 mb-4 font-light"
                        >
                          {arg.description}
                        </div>
                      )}
                    </div>
                  ))}
              </>
            )}
          </div>
          {children && children}
        </Form>
      )}
    </Formik>
  );
};

export { ConstantsForm };
