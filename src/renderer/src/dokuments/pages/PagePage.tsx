import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Image } from "@/components/ui/image";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { DokumentsPage } from "@/linkers";
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
          <div className="flex flex-row gap-2">
            <DokumentsPage.ObjectButton object={data.page} />
          </div>
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
