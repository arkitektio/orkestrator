import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { PageLayout } from "../../../layout/PageLayout";
import { Group } from "../../../lok/screens/Group";

export interface ManTeamProps {}

export const ManTeam: React.FC<ManTeamProps> = (props) => {
  const { team } = useParams<{ team: string }>();

  if (!team) return <></>;

  return <Group id={team} />;
};
