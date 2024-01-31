import { withOmeroArk } from "@jhnnsrs/omero-ark";
import { Form, Formik } from "formik";
import { useState } from "react";
import { SubmitButton } from "../components/forms/fields/SubmitButton";
import { IntInputField } from "../components/forms/fields/int_input";
import { SecretInputField } from "../components/forms/fields/secret_input";
import { TextInputField } from "../components/forms/fields/text_input";
import { ModuleLayout } from "../layout/ModuleLayout";
import { PageLayout } from "../layout/PageLayout";
import { useEnsureOmeroUserMutation, useMeQuery } from "./api/graphql";





export const Fallback = () => {

    const [setMe, data] = withOmeroArk(useEnsureOmeroUserMutation)({
        refetchQueries: ["Me"]
    });

    const [showAdvanced, setShowAdvanced] = useState(false)

    return <ModuleLayout>
        <PageLayout>


        <div className="flex flex-col flex-1 items-center justify-center dark:text-white ">
            <h1 className="text-3xl font-bold ">No account associated</h1>
            <p className="text-xl">Please log in to your OMERO server</p>


            <Formik
                initialValues={{ username: "", password: "", host: "omeroserver", port: 4064}}
                onSubmit={async (values, { setSubmitting }) => {
                    await setMe({ variables: values })
                    setSubmitting(false);
                }}
            >
                {({ isSubmitting }) => (
                    <Form className="flex flex-col items-center justify-center mt-2">
                        <TextInputField name="username" placeholder="Username" label="Username" description="Please enter your OMERO username" />
                        <SecretInputField name="password" placeholder="Password" label="Password" description="Please enter your OMERO password"/>
                        <div className="flex flex-row items-center justify-center">
                            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-light underline">
                                {showAdvanced ? "Hide" : "Show"} advanced
                            </button>
                        </div>
                        {showAdvanced && <>
                            <div className="text-gray-500 justify-center items-center text-center align-center">
                            All fields are optional.<br/> These need to be accessible from your server.
                        </div>
                            <TextInputField name="host" placeholder="Host" label="Host" description="Please enter your OMERO host "/>
                            <IntInputField name="port" placeholder="Port" label="Port" description="Please enter your OMERO server port"/>
                        </>}
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



