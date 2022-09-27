import * as React from "react";
import { MyAgents } from "../../components/MyAgents";
import { MyAssignations } from "../../components/MyAssignations";
import { MyProvisions } from "../../components/MyProvisions";
import { MyRepositories } from "../../components/MyRepositories";
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
      <MyRepositories />
    </PageLayout>
  );
};

export default DashBoardHome;
