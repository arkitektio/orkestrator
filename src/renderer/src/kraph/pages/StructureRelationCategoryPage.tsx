import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { FormSheet } from "@/components/dialog/FormDialog";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { DragZone } from "@/components/upload/drag";
import { useKraphMediaUpload } from "@/datalayer/hooks/useKraphMediaUpload";
import {
  KraphStructureRelationCategory
} from "@/linkers";
import {
  useGetStructureRelationCategoryQuery,
  useUpdateStructureRelationCategoryMutation
} from "../api/graphql";
import UpdateStructureRelationCategoryForm from "../forms/UpdateStructureRelationCategoryForm";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

const Page = asDetailQueryRoute(
  useGetStructureRelationCategoryQuery,
  ({ data, refetch }) => {
    const uploadFile = useKraphMediaUpload();
    const [update] = useUpdateStructureRelationCategoryMutation();

    const createFile = async (file: File) => {
      const response = await uploadFile(file);
      if (response) {
        await update({
          variables: {
            input: {
              id: data.structureRelationCategory.id,
              image: response,
            },
          },
        });
        await refetch();
      }
    };

    return (
      <KraphStructureRelationCategory.ModelPage
        object={{ id: data.structureRelationCategory.id }}
        title={data?.structureRelationCategory.label}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <KraphStructureRelationCategory.Knowledge
                object={{ id: data.structureRelationCategory.id }}
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
              <UpdateStructureRelationCategoryForm
                structureRelationCategory={data.structureRelationCategory}
              />
            </FormSheet>
          </div>
        }
      >
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.structureRelationCategory.label}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              {data.structureRelationCategory.ageName}
            </p>
          </div>
          <div className="w-full h-full flex-row relative">
            {data.structureRelationCategory?.image && (
              <WithKraphMediaUrl media={data.structureRelationCategory.image}>
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

      </KraphStructureRelationCategory.ModelPage>
    );
  },
);

export default Page;
