import * as React from "react";
import { MyRuns } from "../../../components/MyRuns";

interface IFlowHomeProps {}

const RunsHome: React.FunctionComponent<IFlowHomeProps> = (props) => {
  return (
    <>
      <MyRuns />
    </>
  );
};

export default RunsHome;
