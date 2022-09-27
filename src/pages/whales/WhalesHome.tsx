import React from "react";
import { MyRepos } from "../../components/MyRepos";
import { MySwimmingWhales } from "../../components/MySwimmingWhales";
import { MyWhales } from "../../components/MyWhales";
import { PageLayout } from "../../layout/PageLayout";

export interface WhalesHomeProps {}

export const WhalesHome: React.FC<WhalesHomeProps> = (props) => {
  return (
    <PageLayout>
      {" "}
      <MySwimmingWhales />
      <MyWhales />
      <MyRepos />
    </PageLayout>
  );
};
