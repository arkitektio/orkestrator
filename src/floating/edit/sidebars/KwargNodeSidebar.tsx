import { Form, Formik } from "formik";
import { SearchInput } from "../../../components/forms/fields/SearchInput";
import { ParagraphInputField } from "../../../components/forms/fields/paragraph_input";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { FlowNode, KwargNodeData } from "../../types";
import { notEmpty } from "../../utils";
import { useEditRiver } from "../context";
import { SidebarProps } from "./types";

const widget_options = [
  {
    label: "Search Widget",
    value: "SearchWidget",
  },
];

export const KwargNodeSidebar = (
  props: SidebarProps<FlowNode<KwargNodeData>>
) => {
  const { globals, setGlobals } = useEditRiver();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">Args</div>
      <div className="text-white flex-initial mt-2">
        Describe your port a little better
      </div>
      {globals?.filter(notEmpty).map((global, index) => (
        <div className="flex-grow">
          <Formik
            initialValues={global}
            onSubmit={async (values, { setSubmitting }) => {
              setGlobals(globals.map((a, i) => (i === index ? values : a)));
            }}
          >
            {(formikProps) => (
              <Form>
                <ChangeSubmitHelper debounce={300} />
                <div className="flex flex-col ">
                  <div className="flex flex-col">
                    <div className="flex flex-row">
                      {global.toKeys?.join("->")}
                    </div>
                    <TextInputField
                      name={`description`}
                      label="label"
                      description="Human readable label for the port"
                    />
                    {global?.port?.assignWidget?.kind && (
                      <SearchInput
                        searchFunction={async () => widget_options}
                        name={`port.assignWidget.kind`}
                        label="Widget Type"
                        description="Which Widget should we use for this?"
                      />
                    )}
                    {global?.port?.assignWidget?.kind == "SearchWidget" && (
                      <ParagraphInputField
                        name={`port.assignWidget.query`}
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
      ))}
    </div>
  );
};
