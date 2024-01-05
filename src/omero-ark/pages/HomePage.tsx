import React from "react";
import { PageLayout } from "../../layout/PageLayout";
import ProjectList from "../components/lists/ProjectList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout actions={<></>}>
      <ProjectList/>
    </PageLayout>
  );
};

export default Page;
