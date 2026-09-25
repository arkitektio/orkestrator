import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { Image } from "@/core/components/ui/image";
import { useResolve } from "@/core/datalayer/hooks/useResolve";
import { DokumentsPage } from "@/core/linkers";
import { useGetPageQuery } from "../api/graphql";

export const PagePage = asDetailQueryRoute(
  useGetPageQuery,
  ({ data }) => {

    const resolve = useResolve();


    return (
      <DokumentsPage.ModelPage
        title={data?.page && `Page ${data.page.index + 1}`}
        object={data?.page}
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

        <Image src={resolve(data.page.image.presignedUrl)} className="w-full h-full" />

      </DokumentsPage.ModelPage>
    );
  },
);


export default PagePage;
