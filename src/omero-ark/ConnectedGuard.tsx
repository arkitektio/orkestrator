import { withOmeroArk } from "@jhnnsrs/omero-ark";
import { Form, Formik } from "formik";
import { SubmitButton } from "../components/forms/fields/SubmitButton";
import { SecretInputField } from "../components/forms/fields/secret_input";
import { TextInputField } from "../components/forms/fields/text_input";
import { ModuleLayout } from "../layout/ModuleLayout";
import { PageLayout } from "../layout/PageLayout";
import { useEnsureOmeroUserMutation, useMeQuery } from "./api/graphql";





export const Fallback = () => {

    const [setMe, data] = withOmeroArk(useEnsureOmeroUserMutation)({
        refetchQueries: ["Me"]
    });

    return <ModuleLayout>
        <PageLayout>


        <div className="flex flex-col flex-1 items-center justify-center dark:text-white ">
            <h1 className="text-3xl font-bold ">No account associated</h1>
            <p className="text-xl">Please log in to your OMERO server</p>


            <Formik
                initialValues={{ username: "", password: "" }}
                onSubmit={async (values, { setSubmitting }) => {
                    await setMe({ variables: values })
                    setSubmitting(false);
                }}
            >
                {({ isSubmitting }) => (
                    <Form className="flex flex-col items-center justify-center mt-2">
                        <TextInputField name="username" placeholder="Username" label="Username" description="Please enter your OMERO username" />
                        <SecretInputField name="password" placeholder="Password" label="Password" description="Please enter your OMERO password"/>
                        <SubmitButton className="bg-primary-400 rounded px-3 py-2 border-primary-200 hover:bg-primary-300 border-1 ">
                            Associate
                        </SubmitButton>
                    </Form>
                )}
            </Formik>

            

            </div>
        
        
        
        </PageLayout>
        
        
        
    </ModuleLayout>
}




export const ConnectedGuard = ({children}: {children: React.ReactNode}) => {
    const { data, error} = withOmeroArk(useMeQuery)()


    if (error) {
        return <> Couldn't request user data. </>
    }

    if (!data) {
        return <> Loading...</>
    }

    if (!data.me.omeroUser) {
        return <Fallback/>
    }


    return <>{children}</>

}



