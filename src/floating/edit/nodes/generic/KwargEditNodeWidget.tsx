import React, { useState } from "react";
import { BsTrash } from "react-icons/bs";
import ReactTooltip from "react-tooltip";
import { withLayout } from "../../../base/node/layout";
import { KwargNodeProps } from "../../../types";
import { useEditRiver } from "../../context";
import { NodeEditLayout } from "../layout/NodeEdit";

export const KwargEditNodeWidget: React.FC<KwargNodeProps> = withLayout(
  ({ data: { constream }, id }) => {
    const [show, setShow] = useState(false);
    const { globals } = useEditRiver();

    const [isSmall, setIsSmall] = useState(true);

    const bigWidth = 500;

    return (
      <>
        <NodeEditLayout color="green" id={id}>
          {!isSmall && (
            <>
              <div className="flex">
                {constream?.map((s, index) => (
                  <>
                    <div
                      key={index}
                      className="flex-1 border m-1 py-0 px-1 rounded border-gray-200"
                      data-tip={s && s.map((v) => v?.kind).join("|")}
                      data-for={"tooltip_special" + id}
                    >
                      <div className="flex justify-between">
                        {globals?.map((global) => (
                          <div className="flex items-center">
                            <div>{global?.key}</div>
                            <div>{global?.locked}</div>
                          </div>
                        ))}
                        <button onClick={() => alert("implement")}>
                          <BsTrash />
                        </button>
                      </div>
                    </div>
                  </>
                ))}
              </div>
              <ReactTooltip id={"tooltip_special" + id} />
            </>
          )}

          <div className="px-2 py-2">
            <div
              className="font-light text-xl w-full text-center custom-drag-handle cursor-pointer"
              onDoubleClick={() => setIsSmall(!isSmall)}
            >
              Constants{" "}
            </div>
            <p className="text-gray-700 text-base"></p>
            {globals?.map((global) => (
              <div className="flex items-center">
                <div>{global?.key}</div>
                <div>{global?.locked}</div>
              </div>
            ))}
          </div>
        </NodeEditLayout>
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
