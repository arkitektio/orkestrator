import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import {
  DetailPane,
  DetailPaneHeader,
  DetailPaneTitle,
} from "@/core/ui/pane";
import { OmeroArkDataset } from "@/core/linkers";
import { useGetDatasetQuery } from "../api/graphql";
import ImageList from "../components/lists/ImageList";
import { OMEROARK_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page = asDetailQueryRoute(useGetDatasetQuery, ({ data }) => {


  return (
    <OmeroArkDataset.ModelPage
      help={OMEROARK_HELP.dataset}
      object={data.dataset}
      title={data?.dataset?.name}
    >
      <DetailPane className="p-3 @container">
        <DetailPaneHeader>
          <DetailPaneTitle actions={<></>}>
            {data?.dataset?.name}
          </DetailPaneTitle>
        </DetailPaneHeader>
        <div className="flex flex-col p-3 rounded rounded-md mt-2 mb-2">
          <div className="font-light mt-2 ">Created At</div>
          <div className="font-light mt-2 ">Created by</div>

          <div className="font-light mt-2 ">Tags</div>
          <div className="text-xl flex mb-2">
            {data?.dataset?.tags?.map((tag) => (
              <span className="font-semibold mr-2" key={tag}>#{tag} </span>
            ))}
          </div>
        </div>
        {/* A page at a time, asked of OMERO: a dataset can hold thousands. */}
        <ImageList filters={{ dataset: data.dataset.id }} title={`Contained Images (${data.dataset.imageCount})`} />
      </DetailPane>
    </OmeroArkDataset.ModelPage>
  );
});

export default Page;
