import { Form, Formik } from "formik";
import { ParagraphInputField } from "../../../components/forms/fields/paragraph_input";
import { SelectInputField } from "../../../components/forms/fields/select_input";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { StreamKind } from "../../../fluss/api/graphql";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { ArgNodeData, FlowNode } from "../../types";
import { useEditRiver } from "../context";
import { SidebarProps } from "./types";

export const CanvasSidebar = (props: {}) => {
  const { flow } = useEditRiver();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">Flow</div>
      <div className="text-white flex-initial mt-2">{flow.id}</div>
    </div>
  );
};
