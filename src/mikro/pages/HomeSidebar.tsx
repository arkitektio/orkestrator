import { Field, FieldProps, Form, Formik } from "formik";
import ReactDatePicker from "react-datepicker";
import { VscClose } from "react-icons/vsc";
import { Alert } from "../../components/forms/Alert";
import { SwitchInputField } from "../../components/forms/fields/switch_input";
import { ChangeSubmitHelper } from "../../rekuest/ui/helpers/ChangeSubmitter";
import { DataHomeFilterParams } from "./Home";

const HomeSidebar: React.FunctionComponent<{
  setFilterParams: (params: DataHomeFilterParams) => void;
  initialValues: DataHomeFilterParams;
}> = ({ setFilterParams, initialValues }) => {
  return (
    <>
      <Formik<DataHomeFilterParams>
        initialValues={initialValues}
        onSubmit={(values, { setSubmitting }) => {
          console.log(values);
          setFilterParams(values);
          setSubmitting(false);
        }}
      >
        {(formik) => (
          <Form className="w-full p-3  flex-col">
            <ChangeSubmitHelper debounce={200} />
            <div className="flex flex-col">
              <Field name={"createdDay"}>
                {({ field, form, meta }: FieldProps) => (
                  <div className="w-full mt-2 mb-2 relative z-100">
                    <div className=" flex flex-col">
                      <ReactDatePicker
                        className="w-full text-center outline-none"
                        dateFormat="MMMM d, yyyy h:mm aa"
                        todayButton="Today"
                        inline
                        isClearable
                        selected={field.value && new Date(field.value)}
                        onChange={(date: Date) =>
                          form.setFieldValue(field.name, date)
                        }
                      />
                      {field.value && (
                        <button
                          type="button"
                          className="text-gray-500 mt-1"
                          onClick={() => form.setFieldValue(field.name, null)}
                        >
                          <VscClose />
                        </button>
                      )}
                    </div>
                    {meta.touched && meta.error && (
                      <Alert prepend="Error" message={meta.error} />
                    )}
                  </div>
                )}
              </Field>
              <SwitchInputField name="pinned" label="Pinned" />
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default HomeSidebar;
