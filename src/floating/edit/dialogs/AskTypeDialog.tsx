import { Form, Formik } from "formik";
import { useAlert } from "../../../components/alerter/alerter-context";
import { TwDialog } from "../../../components/dialog/TwDialog";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { CarouselInputField } from "../../../components/forms/fields/carousel_inputs";
import { Submit } from "../../../providers/dialog/DialogProvider";


export type AvailableType = "map" | "filter"

export const typeCarousel: {label: string, value: AvailableType, description: string}[] = [
    {label: "Map", value: "map", description: "Map over a stream"},
    {label: "Filter", value: "filter", description: "Filter over a stream"},
]


export const AskTypeDialog = ({
  submit,
  reject,
  filter,
}: Submit<{ type: AvailableType }> & {filter?: AvailableType[]} ) => {
  const { alert } = useAlert();

  return (
    <Formik<{ type: AvailableType }>
      initialValues={{
        type: filter?.at(0) || "map",
      }}
      onSubmit={async (values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);
        submit(values);
        }
      }
    >
      {(formikProps) => (
        <Form>
          <TwDialog
            title="Create New Workspace"
            buttons={
              <>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => reject()}
                >
                  Cancel
                </button>
                <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-800 disabled:opacity-30">
                  Create Workspace
                </SubmitButton>
              </>
            }
          >
            <div className="mt-2 align-left text-left ">
              <CarouselInputField
                options={typeCarousel.filter((x) => filter?.includes(x.value))}
                labelClassName="text-white"
                optionBuilder={(option) => (
                <div className="flex-shrink"> {option.label}</div>
                )}
                name="type"
                label="Type"
                description="What type of node do you want to create?"
              />
            </div>
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
