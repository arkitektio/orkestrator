import { Form, Formik } from "formik";
import { useAlert } from "../../../components/alerter/alerter-context";
import { TwDialog } from "../../../components/dialog/TwDialog";
import { CreateableSearchInput } from "../../../components/forms/fields/SearchInput";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { Submit } from "../../../providers/dialog/DialogProvider";
import { structure_to_widget } from "../../../rekuest/widgets/returns/fallbacks/StructureReturnWidget";
import { withMikro } from "../../MikroContext";
import {
  MyContextsDocument,
  useCreateContextMutation,
  useCreateRelationMutation,
  useSearchContextsLazyQuery,
  useSearchRelationsLazyQuery,
} from "../../api/graphql";

type Variables = { context: string; relation: string };

export const AskRelationModal = (
  props: Submit<Variables> & {
    leftIdentifier?: string;
    leftObject?: string;
    rightIdentifier?: string;
    rightObject?: string;
  }
) => {
  const { alert } = useAlert();

  const [searchContexts] = withMikro(useSearchContextsLazyQuery)();
  const [searchRelations] = withMikro(useSearchRelationsLazyQuery)();

  const [createContext] = withMikro(useCreateContextMutation)({
    refetchQueries: [MyContextsDocument],
  });

  const [createRelation] = withMikro(useCreateRelationMutation)();

  const relateCreate = async (value: string) => {
    const rel = await createRelation({
      variables: { name: value },
    });

    if (!rel.data?.createRelation) throw new Error("Could not create relation");
    return {
      label: rel.data.createRelation.name,
      value: rel.data.createRelation.id,
    };
  };

  const contextCreate = async (value: string) => {
    const rel = await createContext({
      variables: { name: value },
    });

    if (!rel.data?.createContext) throw new Error("Could not create relation");
    return {
      label: rel.data.createContext.name,
      value: rel.data.createContext.id,
    };
  };

  const relateSearch = async (value?: string, initialValue?: string[]) => {
    console.log("qzery", value, initialValue);
    const res = await searchRelations({
      variables: { search: value, values: initialValue },
    });
    console.log(res.data?.options);
    return res.data?.options || [];
  };

  const contextSearch = async (value?: string, initialValue?: string[]) => {
    console.log("qzery", value, initialValue);
    const res = await searchContexts({
      variables: { search: value, values: initialValue },
    });
    console.log(res.data?.options);
    return res.data?.options || [];
  };

  return (
    <Formik<Variables>
      initialValues={{
        context: "",
        relation: "",
      }}
      onSubmit={async (values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);
        try {
          props.submit(values);
        } catch (e) {
          console.log(e);
          await alert({
            message: "Error",
            subtitle: (e as any).graphQLErrors
              .map((e: any) => e.message)
              .join(" "),
          });
          props.reject();
        }
      }}
    >
      {(formikProps) => (
        <Form>
          <TwDialog
            title="Relate"
            buttons={
              <>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => props.reject()}
                >
                  Cancel
                </button>
                <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-800 disabled:opacity-30">
                  Submit
                </SubmitButton>
              </>
            }
          >
            <div className="mt-2 align-left text-left w-full">
              <div className="mt-2 text-sm mb-3 w-full">
                Relate these to items together
              </div>
              <div className="mt-2 grid gap-1 grid-cols-3 w-full">
                {props.leftIdentifier && props.leftObject && (
                  <div className=" p-2   p-2 border-gray-800 rounded border">
                    {structure_to_widget(props.leftIdentifier, {
                      value: props.leftObject,
                    })}
                  </div>
                )}
                <div className="p-2 border-gray-800 rounded border">
                  <CreateableSearchInput
                    name="relation"
                    searchFunction={relateSearch}
                    createFunction={relateCreate}
                    label="Relation"
                    description="The relationship between these two items"
                  />
                  <CreateableSearchInput
                    name="context"
                    label="Context"
                    searchFunction={contextSearch}
                    createFunction={contextCreate}
                    description="The context in which this relationship exists"
                  />
                </div>
                {props.rightIdentifier && props.rightObject && (
                  <div className="p-2 p-2 border-gray-800 rounded border">
                    {structure_to_widget(props.rightIdentifier, {
                      value: props.rightObject,
                    })}
                  </div>
                )}
              </div>
            </div>
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
