import { Form, Formik } from "formik";
import {
  ListSearchInput,
  SearchInput,
} from "../../../components/forms/fields/SearchInput";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { StreamKind } from "../../../fluss/api/graphql";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { FlowNode, ReturnNodeData } from "../../types";
import { useEditRiver } from "../context";
import { SidebarProps } from "./types";

const widget_options = [
  {
    label: "Image Return Widget",
    value: "ImageReturnWidget",
  },
];

export const ReturnNodeSidebar = (
  props: SidebarProps<FlowNode<ReturnNodeData>>
) => {
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
                  <ChangeSubmitHelper debounce={300} />
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
                      {re?.returnWidget?.kind && (
                        <SearchInput
                          searchFunction={async () => widget_options}
                          name={`returnWidget.kind`}
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
