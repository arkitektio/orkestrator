import * as React from "react";
import { MyAgents } from "../../components/MyAgents";
import { MyAssignations } from "../../components/MyAssignations";
import { Provisions } from "../../components/Provisions";
import { Reservations } from "../../components/Reservations";
import { PageLayout } from "../../layout/PageLayout";

interface IDashBoardHomeProps {}

const DashBoardHome: React.FunctionComponent<IDashBoardHomeProps> = (props) => {
  return (
    <PageLayout>
      <MyAssignations />
      <Reservations />
      <Provisions />
      <MyAgents />
    </PageLayout>
  );
};

export default DashBoardHome;
