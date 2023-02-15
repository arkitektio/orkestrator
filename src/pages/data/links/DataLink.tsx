import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Context } from "../../../mikro/components/Context";
import { Experiment } from "../../../mikro/components/Experiment";
import { Link } from "../../../mikro/components/Link";
import { Model } from "../../../mikro/components/Model";

export interface DataExperimentProps {}

export const DataLink: React.FC<DataExperimentProps> = (props) => {
  const { link } = useParams<{ link: string }>();
  if (!link) return <></>;
  return <Link id={link} />;
};

export default DataLink;
