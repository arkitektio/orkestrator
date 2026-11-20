import { Button } from "@/core/ui/button";
import { Bluetooth } from "lucide-react";
import { Link } from "react-router-dom";
import { LOK_HELP } from "../help";
import { LokDevice } from "@/core/linkers";
import React from "react";
import { DeviceFilterRow, useDeviceFilters } from "../components/filter/DeviceFilterRow";
import DeviceList from "../components/lists/DeviceList";

/**
 * Every device of the organization, under the host's list header, with the
 * Mikro home's kind of filter row over the grid (search, group, order).
 */
const Page: React.FC = () => {
  const deviceFilters = useDeviceFilters();

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
      <div className="flex flex-col gap-3 p-3">
        <DeviceFilterRow filters={deviceFilters} />
        <DeviceList
          title=""
          filters={deviceFilters.filters}
          ordering={deviceFilters.ordering}
          emptyActions={
            deviceFilters.active ? (
              <Button variant="outline" onClick={deviceFilters.clear}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      </div>
    </LokDevice.ListPage>
  );
};

export default Page;
