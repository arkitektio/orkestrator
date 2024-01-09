import { withOmeroArk } from "@jhnnsrs/omero-ark"
import { useDeleteMeMutation } from "../../omero_ark/api/graphql"


export const LogoutButton: React.FC = () => {
    const [deleteMe, _ ] = withOmeroArk(useDeleteMeMutation)(
        {
            refetchQueries: ["Me"]
        }
    )

    return (
        <button onClick={() => deleteMe()} className="bg-primary-400 rounded px-3 py-2 border-primary-200 hover:bg-primary-300 border-1 ">Unassociate Me</button>
    )

}