import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { PageLayout } from "@/core/components/layout/PageLayout";
import {
  DetailPane,
  DetailPaneHeader,
  DetailPaneTitle,
} from "@/core/components/ui/pane";
import { OmeroArkImage } from "@/core/linkers";
import { SlotSections } from "@/core/components/layout/PageSections";
import { useGetOmeroImageQuery } from "../api/graphql";
import AuthorizedImage from "../components/Thumbnail";

const Page = asDetailQueryRoute(useGetOmeroImageQuery, ({ data, id }) => {
  return (
    <PageLayout
      title={data?.image?.name || "Image"}
      pageActions={<OmeroArkImage.Actions object={data?.image} />}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            {data?.image ? (
              <SlotSections
                slot="knowledge"
                identifier="@omeroark/image"
                object={data.image}
              />
            ) : null}
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="flex @2xl:flex-row-reverse flex-col rounded-md gap-4 mt-2 w-full">
        <div className="flex-1 overflow-hidden ">
          <div className=" group overflow-hidden rounded rounded-md shadow shadow-xl relative">
            <AuthorizedImage id={id} />
          </div>
        </div>
        <DetailPane className="flex-grow p-3 @container">
          <DetailPaneHeader>
            <DetailPaneTitle actions={<></>}>
              {data?.image?.name}
            </DetailPaneTitle>
          </DetailPaneHeader>
          <div className="flex flex-col p-3 rounded rounded-md mt-2 mb-2">
            <div className="font-light mt-2 ">Created At</div>
            <div className="font-light mt-2 ">Created by</div>

            <div className="font-light mt-2 ">Tags</div>
            <div className="text-xl flex mb-2">
              {data?.image?.tags?.map((tag) => (
                <span className="font-semibold mr-2" key={tag}>#{tag} </span>
              ))}
            </div>
          </div>
        </DetailPane>
      </div>
    </PageLayout>
  );
});

export default Page;
