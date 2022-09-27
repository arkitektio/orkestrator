import { useParams } from "react-router";
import { AssignationDetail } from "../../detail/AssignationScreen";

export const DashboardAssignation: React.FC = ({}) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <>ssss</>;

  return <AssignationDetail id={id} />;
};
