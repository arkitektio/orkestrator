import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { DetailProvision } from "../../../rekuest/components/ProvisionScreen";

export interface DashboardProvisionProps {}

export const DashboardProvision: React.FC<DashboardProvisionProps> = (
  props
) => {
  let { provision } = useParams<{ provision: string }>();
  if (!provision) return <></>;
  return <DetailProvision id={provision} />;
};
