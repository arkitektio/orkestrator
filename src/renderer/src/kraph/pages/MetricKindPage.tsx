import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { FormSheet } from "@/components/dialog/FormDialog";
import { Sidebars } from "@/components/layout/Sidebars";
import { PageAction } from "@/components/ui/page-action";
import { DragZone } from "@/components/upload/drag";
import { useKraphMediaUpload } from "@/kraph/datalayer/useKraphMediaUpload";
import { KraphMetricKind } from "@/linkers";
import {
  useGetMetricKindQuery,
  useUpdateMetricKindMutation
} from "../api/graphql";
import UpdateMetricKindForm from "../forms/UpdateMetricKindForm";

const Page = asDetailQueryRoute(
  useGetMetricKindQuery,
  ({ data, refetch }) => {
    const uploadFile = useKraphMediaUpload();
    const [update] = useUpdateMetricKindMutation();


    const createFile = async (file: File) => {
      const response = await uploadFile(file);
      if (response) {
        await update({
          variables: {
            input: {
              id: data.metricKind.id,
              image: response,
            },
          },
        });
        await refetch();
      }
    };

    return (
      <KraphMetricKind.ModelPage
        object={{ id: data.metricKind.id }}
        title={data?.metricKind.label}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <KraphMetricKind.Knowledge object={{ id: data.metricKind.id }} />
            </Sidebars.Tab>
          </Sidebars>
        }
        pageActions={
          <>

            <FormSheet
              trigger={<PageAction>Edit</PageAction>}
              onSubmit={() => refetch()}
            >
              <UpdateMetricKindForm metricKind={data.metricKind} />
            </FormSheet>
          </>
        }
      >
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.metricKind.label || data.metricKind.key}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              {data.metricKind.key}
            </p>
          </div>
        </div>
        <DragZone uploadFile={uploadFile} createFile={createFile} />
      </KraphMetricKind.ModelPage>
    );
  },
);


export default Page;
