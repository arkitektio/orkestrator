import React from "react";
import { PageLayout } from "../../layout/PageLayout";
import { LogoutButton } from "../components/LogoutButton";
import ProjectList from "../components/lists/ProjectList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout actions={<></>} sidebars={[{label: "Settings", content: <><LogoutButton/></>, key: "settings"}]}>
      <ProjectList/>
    </PageLayout>
  );
};

export default Page;
