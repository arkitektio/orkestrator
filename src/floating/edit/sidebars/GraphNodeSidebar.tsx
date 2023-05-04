import { Form, Formik } from "formik";
import { ParagraphInputField } from "../../../components/forms/fields/paragraph_input";
import { SearchInput } from "../../../components/forms/fields/SearchInput";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { StreamKind } from "../../../fluss/api/graphql";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { ArgNodeData, FlowNode, GraphNodeData } from "../../types";
import { useEditRiver } from "../context";
import { SidebarProps } from "./types";

const widget_options = [
  {
    label: "Search Widget",
    value: "SearchWidget",
  },
];

export const GraphNodeSidebar = (
  props: SidebarProps<FlowNode<GraphNodeData>>
) => {
  const { args, setArgs } = useEditRiver();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">Args</div>
      <div className="text-white flex-initial mt-2">Not yet implemented</div>
      <div className="text-white flex-initial mt-2">
        Here you would choose where to deploy this specific workflow to
      </div>
    </div>
  );
};
