import { Form, Formik } from "formik";
import React, { memo, useState } from "react";
import { Handle, Position } from "reactflow";
import { BsPlay, BsStop } from "react-icons/bs";
import ReactTooltip from "react-tooltip";
import { RunEventFragment } from "../../../../fluss/api/graphql";
import { withLayout } from "../../../base/node/layout";
import { ArgNodeProps } from "../../../types";
import { useTrackRiver } from "../../context";
import { NodeTrackLayout } from "../layout/NodeTrack";

export const ArgTrackNodeWidget: React.FC<ArgNodeProps> = withLayout(
  ({ data: { outstream, instream }, id }) => {
    const { runState } = useTrackRiver();
    const [show, setShow] = useState(false);
    const [isSmall, setIsSmall] = useState(true);

    const [frozenevent, setFrozenEvent] = useState<
      RunEventFragment | null | undefined
    >();

    const latestEvent =
      frozenevent || runState?.events?.find((e) => e?.source === id);

    return (
      <>
        <NodeTrackLayout color="blue" id={id}>
          <div className="px-2 py-2">
            <div
              className="font-light text-xl custom-drag-handle cursor-pointer"
              onDoubleClick={() => setIsSmall(!isSmall)}
            >
              Inputs {latestEvent?.id}
              <button
                className="text-md font-light"
                onClick={() =>
                  setFrozenEvent(
                    frozenevent == undefined ? latestEvent : undefined
                  )
                }
                title="Toggle freeze"
                aria-details="Toggles freezing the node at the current event"
              >
                {frozenevent == undefined ? <BsStop /> : <BsPlay />}
              </button>
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
        </NodeTrackLayout>
        {outstream.map((s, index) => (
          <Handle
            type="source"
            position={Position.Right}
            id={"return_" + index}
            style={{ background: "#555" }}
            data-tip={s && s.map((s) => s?.key).join(" | ")}
            data-for={"tooltip" + id}
          />
        ))}
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
