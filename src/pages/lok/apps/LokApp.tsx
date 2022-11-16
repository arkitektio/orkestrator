import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { PageLayout } from "../../../layout/PageLayout";
import { App } from "../../../lok/components/App";

export interface ManUserProps {}

export const LokApp: React.FC<ManUserProps> = (props) => {
  const { id } = useParams<{ id: string }>();

  if (!id) return <></>;

  return <App id={id} />;
};
