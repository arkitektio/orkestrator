import { MikroCoordinateSystem } from "@/core/linkers";
import React from "react";
import { useCoordinateSystemFilterBar } from "../components/filter/CoordinateSystemFilterBar";
import CoordinateSystemList from "../components/lists/CoordinateSystemList";
import { MIKRO_HELP } from "../help";

export type ICoordinateSystemsScreenProps = {};

/** Every coordinate system, under the filter row that narrows it (server-side, in the URL). */
const Page: React.FC<ICoordinateSystemsScreenProps> = () => {
  const { filters, ordering, bar } = useCoordinateSystemFilterBar();
  return (
    <MikroCoordinateSystem.ListPage title="Coordinate Systems" help={MIKRO_HELP.coordinateSystems}>
      <div className="flex flex-col gap-3 p-3">
        {/* Under the header, over the list it narrows: the Mikro home's filter row. */}
        {bar}
        <CoordinateSystemList filters={filters} ordering={ordering} pagination={{ limit: 30 }} />
      </div>
    </MikroCoordinateSystem.ListPage>
  );
};

export default Page;
