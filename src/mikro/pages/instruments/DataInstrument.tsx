import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Instrument } from "../../../mikro/components/Instrument";
import { Position } from "../../../mikro/components/Position";

export interface DataInstrumentProps {}

export const DataInstrument: React.FC<DataInstrumentProps> = (props) => {
  const { instrument } = useParams<{ instrument: string }>();
  if (!instrument) return <></>;
  return <Instrument id={instrument} />;
};
