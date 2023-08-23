import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Experiment } from "../../../mikro/components/Experiment";
import { Container } from "../../../port/components/Container";

export interface DataExperimentProps {}

export const PortContainer: React.FC<DataExperimentProps> = (props) => {
  const { container } = useParams<{ container: string }>();
  if (!container) return <></>;
  return <Container id={container} />;
};
