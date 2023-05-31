import * as React from "react";
import {
  BooleanParam,
  NumberParam,
  useQueryParams,
  withDefault,
} from "use-query-params";
import { Generators } from "../../components/Generators";
import { MyBigFiles } from "../../components/MyBigFiles";
import { MyContexts } from "../../components/MyContexts";
import { MyDatasets } from "../../components/MyDatasets";
import { MyExperiments } from "../../components/MyExperiments";
import { MyModels } from "../../components/MyModels";
import { MyPlots } from "../../components/MyPlots";
import { MyRepresentations } from "../../components/MyRepresentations";
import { MySamples } from "../../components/MySamples";
import { MyTables } from "../../components/MyTables";
import { Producers } from "../../components/Producers";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { useMikro } from "../../mikro/MikroContext";
import {
  MyContextsDocument,
  MyDatasetsDocument,
} from "../../mikro/api/graphql";
import { MyEras } from "../../mikro/components/MyEras";
import { MyStages } from "../../mikro/components/MyStages";
import { CreateContextModal } from "../../mikro/components/dialogs/CreateContextModal";
import { CreateDatasetModal } from "../../mikro/components/dialogs/CreateDatasetModal";
import HomeSidebar from "./HomeSidebar";

interface IDataHomeProps {}

export interface DataHomeFilterParams {
  createdDay?: Date;
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

let today = new Date();

// create a custom parameter with a default value
const Bool = withDefault(BooleanParam, false);
const Number = withDefault(NumberParam, 10);
const CreatedDay = withDefault(ISOString, new Date());

export const DataHome: React.FunctionComponent<IDataHomeProps> = (props) => {
  const { client } = useMikro();
  const [filterParams, setFilterParams] = useQueryParams({
    createdDay: CreatedDay,
    limit: Number,
    pinned: Bool,
  });

  const { ask } = useDialog();

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
      actions={
        <>
          {filterParams.createdDay.getDate() == today.getDate() && (
            <>
              <ActionButton
                label="Create new Conext"
                description="Create a new experiment"
                onAction={async () => {
                  await ask(CreateContextModal, {});
                  client?.refetchQueries({
                    include: [MyContextsDocument],
                  });
                }}
              >
                New Context
              </ActionButton>
              <ActionButton
                label="Create new Dataset"
                description="Create a new Dataset"
                onAction={async () => {
                  console.log("create dataset", "LOOOOLK");

                  await ask(CreateDatasetModal, {});
                  client?.refetchQueries({
                    include: [MyDatasetsDocument],
                  });
                }}
              >
                New Dataset
              </ActionButton>
            </>
          )}
        </>
      }
    >
      <h1 className="text-white text-3xl mb-2">
        {filterParams.createdDay.getDate() == today.getDate() ? (
          <>Today</>
        ) : (
          filterParams.createdDay?.toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        )}
      </h1>
      <Generators />
      <Producers />
      <MyDatasets {...filterParams} />
      <MyExperiments {...filterParams} subscribe />
      <MyContexts {...filterParams} />
      <MyModels {...filterParams} />
      <MySamples {...filterParams} />
      <MyEras {...filterParams} />
      <MyStages {...filterParams} />
      <MyRepresentations {...filterParams} />
      <MyBigFiles {...filterParams} />
      <MyTables {...filterParams} />
      <MyPlots {...filterParams} />
    </PageLayout>
  );
};

export default DataHome;
