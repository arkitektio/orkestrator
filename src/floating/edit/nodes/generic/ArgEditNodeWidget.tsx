import { FieldArray, Form, Formik } from "formik";
import React, { memo, useEffect, useState } from "react";
import { Handle, Position, useUpdateNodeInternals } from "react-flow-renderer";
import ReactTooltip from "react-tooltip";
import {
  ArgNode,
  ArgNodeFragment,
  StreamItemInput,
  StreamKind,
} from "../../../../fluss/api/graphql";

import { NodeEditLayout } from "../layout/NodeEdit";
import { ArgNodeProps, FlowNode } from "../../../types";
import { withLayout } from "../../../base/node/layout";
import { useEditRiver } from "../../context";
import { TextInputField } from "../../../../components/forms/fields/text_input";
import { PortKind } from "../../../../rekuest/api/graphql";
import { SubmitButton } from "../../../../components/forms/fields/SubmitButton";
import { SelectInputField } from "../../../../components/forms/fields/select_input";
import { ParagraphInputField } from "../../../../components/forms/fields/paragraph_input";
import { ChangeSubmitHelper } from "../../../../rekuest/ui/helpers/ChangeSubmitter";

const widget_options = [
  {
    label: "Search Widget",
    value: "SearchWidget",
  },
];

export const ArgSidebar = () => {
  const { args, setArgs } = useEditRiver();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">Args</div>
      <div className="text-white flex-initial mt-2">
        Describe your port a little better
      </div>
      {args.map((arg, index) =>
        arg ? (
          <div className="flex-grow">
            <Formik
              initialValues={arg}
              onSubmit={async (values, { setSubmitting }) => {
                setArgs(args.map((a, i) => (i === index ? values : a)));
              }}
            >
              {(formikProps) => (
                <Form>
                  <ChangeSubmitHelper debounce={300} formik={formikProps} />
                  <div className="flex flex-col ">
                    <div className="flex flex-col">
                      <div className="flex flex-row">
                        {arg?.kind == StreamKind.Structure
                          ? arg?.identifier
                          : arg?.kind}
                      </div>
                      <TextInputField
                        name={`key`}
                        label="Key"
                        description="Key for the port"
                      />
                      <TextInputField
                        name={`description`}
                        label="label"
                        description="Human readable label for the port"
                      />
                      {arg?.widget?.kind && (
                        <SelectInputField
                          options={widget_options}
                          name={`widget.kind`}
                          label="label"
                          description="Human readable label for the port"
                        />
                      )}
                      {arg?.widget?.kind == "SearchWidget" && (
                        <ParagraphInputField
                          name={`widget.query`}
                          label="Query"
                          description="Human readable query for the port"
                        />
                      )}
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        ) : (
          <>Unreal arg</>
        )
      )}
    </div>
  );
};

export const ArgEditNodeWidget: React.FC<ArgNodeProps> = withLayout(
  ({ data: { outstream, instream, constream }, id }) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const [isSmall, setIsSmall] = useState(true);

    useEffect(() => {
      console.log("Update node internals", id);
      updateNodeInternals(id);
    }, [outstream, instream, constream]);

    return (
      <>
        <NodeEditLayout color="blue" id={id} sidebar={<ArgSidebar />}>
          <div className="px-2 py-2 ">
            <div
              className="font-light text-xl custom-drag-handle cursor-pointer"
              onDoubleClick={() => setIsSmall(!isSmall)}
            >
              Inputs{" "}
            </div>
            <p className="text-base">
              {outstream && (
                <>
                  {outstream.map((s, index) => (
                    <div className="cursor-pointer">
                      {s && s.map((s) => s?.kind).join(" | ")}
                    </div>
                  ))}
                  <br />
                </>
              )}
              {!isSmall && <></>}
            </p>
          </div>
        </NodeEditLayout>
        {outstream.map((s, index) => (
          <Handle
            type="source"
            position={Position.Right}
            id={"return_" + index}
            style={{ background: "#555", top: 20 * index + 20 }}
            data-tip={s && s.map((s) => s?.key).join(" | ")}
            data-for={"tooltip" + id}
          />
        ))}
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
