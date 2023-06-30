import React from "react";
import { useParams } from "react-router";
import { CollectionScreen } from "../../detail/CollectionScreen";

export interface DashboardRepositoryProps {}

export const DashboardCollection: React.FC<DashboardRepositoryProps> = (
  props
) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <>ssss</>;

  return <CollectionScreen id={id} />;
};
