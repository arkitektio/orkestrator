import * as React from "react";
import { Generators } from "../../components/Generators";
import { MyExperiments } from "../../components/MyExperiments";
import { MyFiles } from "../../components/MyFiles";
import { MyPlots } from "../../components/MyPlots";
import { MyRepresentations } from "../../components/MyRepresentations";
import { MySamples } from "../../components/MySamples";
import { MyTables } from "../../components/MyTables";
import { Producers } from "../../components/Producers";
import { PageLayout } from "../../layout/PageLayout";
import { MyStages } from "../../mikro/components/MyStages";

interface IDataHomeProps {}

export const DataHome: React.FunctionComponent<IDataHomeProps> = (props) => {
  return (
    <PageLayout>
      <Generators />
      <Producers />
      <MyExperiments />
      <MyStages />
      <MySamples />
      <MyRepresentations />
      <MyFiles />
      <MyTables />
      <MyPlots />
    </PageLayout>
  );
};

export default DataHome;
