import React, { useState, useEffect } from "react";
import { MyNodes } from "../../../components/MyNodes";
import { Reservations } from "../../../components/Reservations";
import { PageLayout } from "../../../layout/PageLayout";

export interface DashboardNodesProps {}

export const DashboardReservations: React.FC<DashboardNodesProps> = (props) => {
  return (
    <PageLayout>
      <Reservations />
      <div className="text-white mb-2">
        These reservations are handles by this specific app, below you can find
        reservations handled by other apps
      </div>
    </PageLayout>
  );
};
