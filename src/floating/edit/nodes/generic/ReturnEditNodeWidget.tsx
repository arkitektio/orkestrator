import { Form, Formik } from "formik";
import React, { useState } from "react";
import { Handle, Position } from "react-flow-renderer";
import ReactTooltip from "react-tooltip";
import { ChangeSubmitHelper } from "../../../../arkitekt/ui/helpers/ChangeSubmitter";
import { ParagraphInputField } from "../../../../components/forms/fields/paragraph_input";
import { SelectInputField } from "../../../../components/forms/fields/select_input";
import { TextInputField } from "../../../../components/forms/fields/text_input";
import { StreamKind } from "../../../../fluss/api/graphql";
import { withLayout } from "../../../base/node/layout";
import { ReturnNodeProps } from "../../../types";
import { useEditRiver } from "../../context";
import { NodeEditLayout } from "../layout/NodeEdit";

const widget_options = [
  {
    label: "Image Return Widget",
    value: "ImageReturnWidget",
  },
];

export const ReturnSidebar = () => {
  const { returns, setReturns } = useEditRiver();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">Returns</div>
      <div className="text-white flex-initial mt-2">
        Describe your returns a little better{returns.length}
      </div>
      {returns.map((re, index) =>
        re ? (
          <div className="flex-grow">
            <Formik
              initialValues={re}
              onSubmit={async (values, { setSubmitting }) => {
                setReturns(returns.map((a, i) => (i === index ? values : a)));
              }}
            >
              {(formikProps) => (
                <Form>
                  <ChangeSubmitHelper debounce={300} formik={formikProps} />
                  <div className="flex flex-col ">
                    <div className="flex flex-col">
                      <div className="flex flex-row">
                        {re?.kind == StreamKind.Structure
                          ? re?.identifier
                          : re?.kind}
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
                      {re?.widget?.kind && (
                        <SelectInputField
                          options={widget_options}
                          name={`widget.kind`}
                          label="label"
                          description="Human readable label for the port"
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

export const ReturnEditNodeWidget: React.FC<ReturnNodeProps> = withLayout(
  ({ data: { outstream, instream }, id }) => {
    const [show, setShow] = useState(false);

    const [isSmall, setIsSmall] = useState(true);

    return (
      <>
        <NodeEditLayout color="red" id={id} sidebar={<ReturnSidebar />}>
          <div className="px-2 py-2">
            <div
              className="font-light text-xl custom-drag-handle cursor-pointer"
              onDoubleClick={() => setIsSmall(!isSmall)}
            >
              Outputs
            </div>
            <p className="text-gray-700 text-base">
              <>
                {instream[0]?.map((o) => o?.kind).join(" | ")}
                <br />
              </>
              {!isSmall && (
                <button
                  className="rounded px-2 py-1 text-xs font-semibold border-gray-300"
                  onClick={() => setShow(true)}
                >
                  Add Documentation
                </button>
              )}
            </p>
          </div>
        </NodeEditLayout>
        {instream.map((s, index) => (
          <Handle
            type="target"
            position={Position.Left}
            id={"return_" + index}
            style={{ background: "#555" }}
            data-tip={s && s.map((s) => s?.kind).join(" | ")}
            data-for={"tooltip" + id}
          />
        ))}
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
