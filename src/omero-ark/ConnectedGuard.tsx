import { withOmeroArk } from "@jhnnsrs/omero-ark";
import { useEnsureOmeroUserMutation, useMeQuery } from "./api/graphql";

export const EnsureMeButton = () => {


    const [setMe, data] = withOmeroArk(useEnsureOmeroUserMutation)({
        refetchQueries: ["me"]
    });
  
  
    return <button onClick={() => setMe({ variables: { password: "omero", username: "root"}})}> Set me</button>
  
  
  
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
        return <> You are not yet associated with an account on omero do this now :)<EnsureMeButton/></>
    }


    return <>{children}</>

}



