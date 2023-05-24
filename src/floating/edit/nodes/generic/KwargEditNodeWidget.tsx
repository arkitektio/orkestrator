import React, { useState } from "react";
import ReactTooltip from "react-tooltip";
import { withLayout } from "../../../base/node/layout";
import { KwargNodeProps } from "../../../types";
import { useEditRiver } from "../../context";
import { NodeEditLayout } from "../layout/NodeEdit";

export const KwargEditNodeWidget: React.FC<KwargNodeProps> = withLayout(
  ({ data, id }) => {
    const [show, setShow] = useState(false);
    const { globals } = useEditRiver();

    const [isSmall, setIsSmall] = useState(true);

    const bigWidth = 500;

    return (
      <>
        <NodeEditLayout color="green" id={id}>
          <div className="px-2 py-2">
            <div
              className="font-light text-xl w-full text-center custom-drag-handle cursor-pointer"
              onDoubleClick={() => setIsSmall(!isSmall)}
            >
              Constants{" "}
            </div>
            <p className="text-gray-700 text-base"></p>
          </div>
        </NodeEditLayout>
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
