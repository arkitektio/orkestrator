import { Explainer } from "@/core/layout/Explainer";
import { Button } from "@/core/ui/button";
import { Bluetooth } from "lucide-react";
import { Link } from "react-router-dom";
import { LOK_HELP } from "../help";
import { LokDevice } from "@/core/linkers";
import { Separator } from "@radix-ui/react-dropdown-menu";
import React from "react";
import DeviceList from "../components/lists/DeviceList";
export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <LokDevice.ListPage
      help={LOK_HELP.devices}
      title="Devices"
      pageActions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/lok/devices/provision">
            <Bluetooth className="size-3.5" />
            Provision device
          </Link>
        </Button>
      }
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
