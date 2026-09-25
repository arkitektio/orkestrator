import { Explainer } from "@/components/explainer/Explainer";
import { LokDevice } from "@/linkers";
import { Separator } from "@radix-ui/react-dropdown-menu";
import React from "react";
import DeviceList from "../components/lists/DeviceList";
export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <LokDevice.ListPage
      title="Devices"
    >
      <Explainer
        title="Devices"
        description="Devices or virtual machines that provide computational resources within your Arkitekt Federation. Here you see all compute nodes that are registered and available for task execution."
      />
      <DeviceList />

      <Separator />
    </LokDevice.ListPage>
  );
};

export default Page;
