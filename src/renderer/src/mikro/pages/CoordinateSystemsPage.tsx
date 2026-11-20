import { MikroCoordinateSystem } from "@/core/linkers";
import React from "react";
import CoordinateSystemList from "../components/lists/CoordinateSystemList";
import { MIKRO_HELP } from "../help";

export type ICoordinateSystemsScreenProps = {};

const Page: React.FC<ICoordinateSystemsScreenProps> = () => {
  return (
    <MikroCoordinateSystem.ListPage title="Coordinate Systems" help={MIKRO_HELP.coordinateSystems}>
      <div className="p-3">
        <CoordinateSystemList pagination={{ limit: 30 }} />
      </div>
    </MikroCoordinateSystem.ListPage>
  );
};

export default Page;
