import React, { useState, useEffect } from "react";
import { MyPlots } from "../../../components/MyPlots";
import { MyLives } from "../../../dashboard/MyLives";

export interface DataPlotsProps {}

export const DataLives: React.FC<DataPlotsProps> = (props) => {
  return (
    <>
      <MyLives limit={10} />
    </>
  );
};
