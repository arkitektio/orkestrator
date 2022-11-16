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
        <NodeEditLayout color="blue" id={id}>
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
