import { Form, Formik } from "formik";
import { ParagraphInputField } from "../../../components/forms/fields/paragraph_input";
import { SearchInput } from "../../../components/forms/fields/SearchInput";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { StreamKind } from "../../../fluss/api/graphql";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { ArgNodeData, FlowNode } from "../../types";
import { useEditRiver } from "../context";
import { SidebarProps } from "./types";

const widget_options = [
  {
    label: "Search Widget",
    value: "SearchWidget",
  },
];

export const ArgNodeSidebar = (props: SidebarProps<FlowNode<ArgNodeData>>) => {
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
                  <ChangeSubmitHelper debounce={300} />
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
                      {arg?.assignWidget?.kind && (
                        <SearchInput
                          searchFunction={async () => widget_options}
                          name={`assignWidget.kind`}
                          label="Widget Type"
                          description="Which Widget should we use for this?"
                        />
                      )}
                      {arg?.assignWidget?.kind == "SearchWidget" && (
                        <ParagraphInputField
                          name={`assignWidget.query`}
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
