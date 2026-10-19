import { ErrorNote } from "@/core/ui/error-note";
import { useGetProtocolEventCategoryQuery } from "../api/graphql";
import CreateProtocolEventForm from "./CreateProtocolEventForm";

const TForm = (props: { id: string; rolemap: { [key: string]: any } }) => {
  const { data, error, loading } = useGetProtocolEventCategoryQuery({
    variables: {
      id: props.id,
    },
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <ErrorNote error={error} title="Couldn't load the protocol event category" />;
  if (!data || !data.protocolEventCategory) {
    return <div>No protocol event category found.</div>;
  }

  return (
    <CreateProtocolEventForm
      protocolEventCategory={data.protocolEventCategory}
      rolemap={props.rolemap}
    />
  );
};

export default TForm;
