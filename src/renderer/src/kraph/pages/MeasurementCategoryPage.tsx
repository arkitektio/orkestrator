import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { FormSheet } from "@/components/dialog/FormDialog";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { DragZone } from "@/components/upload/drag";
import { useKraphMediaUpload } from "@/datalayer/hooks/useKraphMediaUpload";
import {
  KraphMeasurementCategory,
  KraphMetricKind
} from "@/linkers";
import {
  useGetMeasurmentCategoryQuery,
  useUpdateMeasurementCategoryMutation
} from "../api/graphql";
import UpdateMeasurementCategoryForm from "../forms/UpdateMeasurementCategoryForm";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

const Page = asDetailQueryRoute(
  useGetMeasurmentCategoryQuery,
  ({ data, refetch }) => {
    const uploadFile = useKraphMediaUpload();
    const [update] = useUpdateMeasurementCategoryMutation();

    const createFile = async (file: File) => {
      const response = await uploadFile(file);
      if (response) {
        await update({
          variables: {
            input: {
              id: data.measurementCategory.id,
              image: response,
            },
          },
        });
        await refetch();
      }
    };

    return (
      <KraphMeasurementCategory.ModelPage
        object={{ id: data.measurementCategory.id }}
        title={data?.measurementCategory.label}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <KraphMetricKind.Knowledge
                object={{ id: data.measurementCategory.id }}
              />
            </Sidebars.Tab>
          </Sidebars>
        }
        pageActions={
          <div className="flex flex-row gap-2">

            <FormSheet
              trigger={<Button variant="outline">Edit</Button>}
              onSubmit={() => refetch()}
            >
              <UpdateMeasurementCategoryForm
                measurementCategory={data.measurementCategory}
              />
            </FormSheet>
          </div>
        }
      >
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.measurementCategory.label}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              {data.measurementCategory.ageName}
            </p>
          </div>
          <div className="w-full h-full flex-row relative">
            {data.measurementCategory?.image && (
              <WithKraphMediaUrl media={data.measurementCategory.image}>
                {(url) => (
                  <Image
                    src={url}
                    style={{ filter: "brightness(0.7)" }}
                    className="object-cover h-full w-full absolute top-0 left-0 rounded rounded-lg"
                  />
                )}
              </WithKraphMediaUrl>
            )}
          </div>
        </div>
        <DragZone uploadFile={uploadFile} createFile={createFile} />

        <div className="flex flex-col p-6 h-full">
          {data.measurementCategory.relevantQueries.length > 0 ? (
            <ul className="list-disc pl-4 text-sm">
              {data.measurementCategory.relevantQueries.map((query) => (
                <li key={query.id}>{query.label}</li>
              ))}
            </ul>
          ) : (
            <div className="h-ful w-ull flex flex-col items-center justify-center">
              <p className="text-sm font-light mb-3">
                No Graph Query yet for this category
              </p>
            </div>
          )}
        </div>
      </KraphMeasurementCategory.ModelPage>
    );
  },
);


export default Page;
