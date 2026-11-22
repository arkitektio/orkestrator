import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { DialogButton } from "@/core/ui/dialog-button";
import {
  DetailPane,
  DetailPaneHeader,
  DetailPaneTitle,
} from "@/core/ui/pane";
import { OmeroArkProject } from "@/core/linkers";
import { PlusIcon } from "lucide-react";
import { useGetProjectQuery } from "../api/graphql";
import DatasetList from "../components/lists/DatasetList";
import { OMEROARK_HELP } from "../help";


const Page = asDetailQueryRoute(useGetProjectQuery, ({ data }) => {

  return (
    <OmeroArkProject.ModelPage
      help={OMEROARK_HELP.project}
      object={data?.project}
      title={data?.project?.name}
      pageActions={<>
        <DialogButton
          alwaysShow
          name="createomeroarkcataset"
          variant={"outline"}
          size={"sm"}
          dialogProps={{
            project: data?.project,
          }}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create
        </DialogButton>
      </>}>

      <DetailPane className="p-3 @container">
        <DetailPaneHeader>
          <DetailPaneTitle actions={<></>}>
            {data?.project?.name}
          </DetailPaneTitle>
        </DetailPaneHeader>
        <div className="flex flex-col  p-3 rounded rounded-md mt-2 mb-2">
          <div className="font-light mt-2 ">Created At</div>
          <div className="font-light mt-2 ">Created by</div>

          <div className="font-light mt-2 ">Tags</div>
          <div className="text-xl flex mb-2">
            {data?.project?.tags?.map((tag) => (
              <span className="font-semibold mr-2" key={tag}>#{tag} </span>
            ))}
          </div>
        </div>
        <DatasetList filters={{ project: data.project.id }} title={`Contained Datasets (${data.project.datasetCount})`} />
      </DetailPane>
    </OmeroArkProject.ModelPage>
  );
});

export default Page;
