import React, { useState, useEffect } from "react";
import { MyPlots } from "../../../components/MyPlots";

export interface DataPlotsProps {}

export const DataPlots: React.FC<DataPlotsProps> = (props) => {
  return (
    <>
      <MyPlots />
    </>
  );
};
