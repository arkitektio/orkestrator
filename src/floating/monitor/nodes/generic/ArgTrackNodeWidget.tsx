import { Form, Formik } from "formik";
import React, { memo, useState } from "react";
import { Handle, Position } from "react-flow-renderer";
import ReactTooltip from "react-tooltip";
import { withLayout } from "../../../base/node/layout";
import { ArgNodeProps } from "../../../types";
import { NodeMonitorLayout } from "../layout/NodeTrack";

export const ArgTrackNodeWidget: React.FC<ArgNodeProps> = withLayout(
  ({ data: { outstream, instream }, id }) => {
    const [show, setShow] = useState(false);
    const [isSmall, setIsSmall] = useState(true);

    return (
      <>
        <NodeMonitorLayout color="blue" id={id}>
          <div className="px-2 py-2">
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
              {!isSmall && (
                <>
                  <Formik
                    initialValues={{
                      args: outstream,
                    }}
                    onSubmit={(values) => {
                      console.log(values);
                    }}
                  >
                    <Form>
                      <div className="flex flex-col">
                        <div className="flex flex-row">
                          {outstream?.map((arg, index) => (
                            <>
                              <div className="flex-1 mt-2">
                                <textarea
                                  className="w-full px-2 py-2 rounded-md text-2xs dark:text-white dark:bg-slate-600 caret-green-500 mt-2"
                                  name={`args.${index}.description`}
                                  placeholder="Description"
                                />
                              </div>
                            </>
                          ))}
                        </div>
                      </div>
                    </Form>
                  </Formik>
                </>
              )}
            </p>
          </div>
        </NodeMonitorLayout>
        {outstream.map((s, index) => (
          <Handle
            type="source"
            position={Position.Right}
            id={"return_" + index}
            style={{ background: "#555", top: 20 * index }}
            data-tip={s && s.map((s) => s?.key).join(" | ")}
            data-for={"tooltip" + id}
          />
        ))}
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
