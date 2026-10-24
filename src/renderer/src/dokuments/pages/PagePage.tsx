import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { DokumentsImage } from "../datalayer/dokumentsAccess";
import { DokumentsPage } from "@/core/linkers";
import { useGetPageQuery } from "../api/graphql";
import { DOKUMENTS_HELP } from "../help";

export const PagePage = asDetailQueryRoute(
  useGetPageQuery,
  ({ data }) => {



    return (
      <DokumentsPage.ModelPage
        title={data?.page && `Page ${data.page.index + 1}`}
        object={data?.page}
        help={DOKUMENTS_HELP.page}
        pageActions={
          <>
            <DokumentsPage.ObjectButton alwaysShow object={data.page} />
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <DokumentsPage.Knowledge object={data.page} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        {data.page.id}
        {data.page.content}

        <DokumentsImage store={data.page.image} className="w-full h-full" />

      </DokumentsPage.ModelPage>
    );
  },
);


export default PagePage;
