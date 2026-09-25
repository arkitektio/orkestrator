import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { ListRender } from "@/core/components/layout/ListRender";
import { DialogButton } from "@/core/components/ui/dialog-button";
import {
  DetailPane,
  DetailPaneHeader,
  DetailPaneTitle,
} from "@/core/components/ui/pane";
import { OmeroArkProject } from "@/core/linkers";
import { PlusIcon } from "lucide-react";
import { useGetProjectQuery } from "../api/graphql";
import DatasetCard from "../components/cards/DatasetCard";


const Page = asDetailQueryRoute(useGetProjectQuery, ({ data, refetch }) => {

  return (
    <OmeroArkProject.ModelPage
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
            onSuccess: () => refetch(),
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
        <ListRender title="Contained Dataset" array={data?.project?.datasets}>
          {(item, index) => <DatasetCard item={item} key={index} />}
        </ListRender>
      </DetailPane>
    </OmeroArkProject.ModelPage>
  );
});

export default Page;
