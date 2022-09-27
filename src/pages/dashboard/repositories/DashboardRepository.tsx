import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { RepositoryScreen } from "../../detail/RepositoryScreen";

export interface DashboardRepositoryProps {}

export const DashboardRepository: React.FC<DashboardRepositoryProps> = (
  props
) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <>ssss</>;

  return <RepositoryScreen id={id} />;
};
