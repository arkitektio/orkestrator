import { Explainer } from "@/components/explainer/Explainer";
import { LokApp } from "@/linkers";
import { Separator } from "@radix-ui/react-dropdown-menu";
import React from "react";
import AppList from "../components/lists/AppList";
export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <LokApp.ListPage
      title="Applications"
    >
      <Explainer
        title="Applications"
        description="Applications are your workhorses. They are the main way you interact with your data and services. Here you see all applications that are available within your Organisation"
      />
      <AppList />

      <Separator />
    </LokApp.ListPage>
  );
};

export default Page;
