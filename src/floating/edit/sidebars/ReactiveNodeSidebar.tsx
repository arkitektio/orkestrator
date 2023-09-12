import { Field, Form, Formik } from "formik";
import {
  PortFragment,
  StreamKind,
  useDetailReactiveTemplateQuery,
} from "../../../fluss/api/graphql";
import { withFluss } from "../../../fluss/fluss";
import { FlowNode, ReactiveNodeData } from "../../types";
import { globalArgKey, notEmpty } from "../../utils";
import { useEditRiver } from "../context";
import { StreamDisplay } from "./StreamDisplay";
import { SidebarProps } from "./types";

export const ReactiveNodeSidebar = (
  props: SidebarProps<FlowNode<ReactiveNodeData>>
) => {
  const { updateNodeIn, updateNodeOut, updateNodeExtras, globals, setGlobals } =
    useEditRiver();

  const { data } = withFluss(useDetailReactiveTemplateQuery)({
    variables: { implementation: props.node.data.implementation },
  });

  let id = props.node.id;
  const omitKeys2 =
    globals
      ?.reduce(
        (a, b) => a.concat(b?.toKeys.filter(notEmpty) || []),
        [] as string[]
      )
      .filter((x) => x.startsWith(props.node.id))
      .map((x) => x.split(".").at(1)) || [];

  const setArg = (arg: PortFragment) => {
    if (globals?.find((s) => s?.toKeys.includes(globalArgKey(id, arg.key)))) {
      setGlobals(
        globals
          .map((s) =>
            s?.toKeys.includes(globalArgKey(id, arg.key))
              ? s.toKeys.length == 1
                ? undefined
                : {
                    ...s,
                    toKeys: s.toKeys.filter(
                      (k) => k !== globalArgKey(id, arg.key)
                    ),
                  }
              : s
          )
          .filter(notEmpty)
      );
    } else {
      setGlobals(
        globals?.concat({
          toKeys: [globalArgKey(id, arg.key)],
          port: {
            ...arg,
            description:
              (arg.description || "") +
              ` (maps to ${globalArgKey(id, arg.key)})`,
          },
        }) || []
      );
    }
  };

  return (
    <>
      <div className="px-5 py-5 flex flex-col">
        <StreamDisplay node={props.node} />
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
                  .map((c, index) => (
                    <div key={index}>
                      {!omitKeys2.includes(c?.key) ? (
                        <>
                          <div
                            className="text-white mt-2 cursor-pointer"
                            onClick={() => setArg(c)}
                          >
                            {c?.label}
                          </div>
                          {c.kind == StreamKind.String && (
                            <Field type="test" name={c?.key} />
                          )}
                          {c.kind == StreamKind.Bool && (
                            <Field type="checkbox" name={c?.key} />
                          )}
                          {c.kind == StreamKind.Int && (
                            <Field type="number" name={c?.key} />
                          )}
                          {c.kind == StreamKind.Float && (
                            <Field type="number" name={c?.key} />
                          )}
                          <div className="text-white mt-2">
                            {c?.description}
                          </div>
                        </>
                      ) : (
                        <div
                          className="text-white bg-pink-200 rounded rounded-md p-2 mt-2 cursor-pointer"
                          onClick={() => setArg(c)}
                        >
                          {c?.label || c.key}
                        </div>
                      )}
                    </div>
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
