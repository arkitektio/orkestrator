import * as React from "react";
import { useSearchParams } from "react-router-dom";
import Timestamp from "react-timestamp";
import {
  useQueryParams,
  StringParam,
  NumberParam,
  ArrayParam,
  withDefault,
  DateParam,
  BooleanParam,
} from "use-query-params";
import { number } from "yup/lib/locale";
import { Generators } from "../../components/Generators";
import { MyBigFiles } from "../../components/MyBigFiles";
import { MyContexts } from "../../components/MyContexts";
import { MyDatasets } from "../../components/MyDatasets";
import { MyExperiments } from "../../components/MyExperiments";
import { MyFiles } from "../../components/MyFiles";
import { MyModels } from "../../components/MyModels";
import { MyPlots } from "../../components/MyPlots";
import { MyRepresentations } from "../../components/MyRepresentations";
import { MySamples } from "../../components/MySamples";
import { MyTables } from "../../components/MyTables";
import { Producers } from "../../components/Producers";
import { PageLayout } from "../../layout/PageLayout";
import { MyStages } from "../../mikro/components/MyStages";
import HomeSidebar from "./HomeSidebar";

interface IDataHomeProps {}

export interface DataHomeFilterParams {
  createdDay?: Date | null;
  limit: number;
  pinned?: boolean;
}

const ISOString = {
  encode: (date: Date) => date.toISOString(),
  decode: (arrayStr: string | (string | null)[] | null | undefined) => {
    if (Array.isArray(arrayStr)) {
      return null;
    }
    return arrayStr ? new Date(arrayStr) : null;
  },
};

// create a custom parameter with a default value
const Bool = withDefault(BooleanParam, false);
const Number = withDefault(NumberParam, 10);

export const DataHome: React.FunctionComponent<IDataHomeProps> = (props) => {
  const [filterParams, setFilterParams] = useQueryParams({
    createdDay: ISOString,
    limit: Number,
    pinned: Bool,
  });

  return (
    <PageLayout
      sidebars={[
        {
          key: "home",
          label: "home",
          content: (
            <HomeSidebar setFilterParams={setFilterParams}></HomeSidebar>
          ),
        },
      ]}
    >
      <h1 className="text-white text-3xl mb-2">
        {filterParams.createdDay?.toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </h1>
      <Generators />
      <Producers />
      <MyDatasets {...filterParams} />
      <MyExperiments {...filterParams} subscribe />
      <MyContexts {...filterParams} />
      <MyModels {...filterParams} />
      <MySamples {...filterParams} />
      <MyStages {...filterParams} />
      <MyRepresentations {...filterParams} />
      <MyBigFiles {...filterParams} />
      <MyTables {...filterParams} />
      <MyPlots {...filterParams} />
    </PageLayout>
  );
};

export default DataHome;
