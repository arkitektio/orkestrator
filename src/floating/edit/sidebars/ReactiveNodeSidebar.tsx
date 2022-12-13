import { Field, Form, Formik } from "formik";
import {
  ConstantKind,
  useDetailReactiveTemplateQuery,
} from "../../../fluss/api/graphql";
import { withFluss } from "../../../fluss/fluss";
import { FlowNode, ReactiveNodeData } from "../../types";
import { notEmpty } from "../../utils";
import { useEditRiver } from "../context";
import { StreamDisplay } from "./StreamDisplay";
import { SidebarProps } from "./types";

export const ReactiveNodeSidebar = (
  props: SidebarProps<FlowNode<ReactiveNodeData>>
) => {
  const { updateNodeIn, updateNodeOut, updateNodeExtras } = useEditRiver();

  const { data } = withFluss(useDetailReactiveTemplateQuery)({
    variables: { implementation: props.node.data.implementation },
  });

  return (
    <>
      <div className="px-5 py-5 flex flex-col">
        <StreamDisplay node={props.node} />
        {JSON.stringify(data)}
        {data?.reactivetemplate?.id && (
          <Formik<{ [key: string]: any }>
            onSubmit={async (values) => {
              console.log(values);
              updateNodeExtras(props.node.id, {
                ...props.node.data,
                defaults: values,
              });
            }}
            initialValues={props.node.data.defaults || {}}
          >
            {(formikProps) => (
              <Form>
                <div className="text-white mt-5">Reserve Params</div>
                {data?.reactivetemplate?.constants
                  ?.filter(notEmpty)
                  .map((c) => (
                    <>
                      <div className="text-white mt-2">{c?.label}</div>
                      {c.kind == ConstantKind.String && (
                        <Field type="test" name={c?.key} />
                      )}
                      {c.kind == ConstantKind.Bool && (
                        <Field type="checkbox" name={c?.key} />
                      )}
                      {c.kind == ConstantKind.Int && (
                        <Field type="number" name={c?.key} />
                      )}
                      {c.kind == ConstantKind.Float && (
                        <Field type="number" name={c?.key} />
                      )}
                      <div className="text-white mt-2">{c?.description}</div>
                    </>
                  ))}
                <button type="submit">Submit</button>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </>
  );
};
