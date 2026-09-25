import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { FormSheet } from "@/core/dialogs/FormDialog";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageAction } from "@/core/ui/page-action";
import { Image } from "@/core/ui/image";
import { DragZone } from "@/core/datalayer/upload/drag";
import { useKraphMediaUpload } from "@/kraph/datalayer/useKraphMediaUpload";
import {
  KraphStructureKind
} from "@/core/linkers";
import {
  useGetStructureKindQuery,
  useUpdateStructureKindMutation,
} from "../api/graphql";
import UpdateStructureKindForm from "../forms/UpdateStructureKindForm";
import StructureList from "../components/renderers/lists/StructureList";
import { WithKraphMediaUrl } from "@/kraph/datalayer/kraphAccess";

const Page =  asDetailQueryRoute(
  useGetStructureKindQuery,
  ({ data, refetch }) => {
    const uploadFile = useKraphMediaUpload();
    const [update] = useUpdateStructureKindMutation();

    const createFile = async (file: File) => {
      const response = await uploadFile(file);
      if (response) {
        await update({
          variables: {
            input: {
              id: data.structureKind.id,
              image: response,
            },
          },
        });
        await refetch();
      }
    };

    return (
      <KraphStructureKind.ModelPage
        object={{ id: data.structureKind.id }}
        title={data?.structureKind.identifier}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <KraphStructureKind.Knowledge
                object={{ id: data.structureKind.id }}
              />
            </Sidebars.Tab>
          </Sidebars>
        }
        pageActions={
          <>
            <KraphStructureKind.ObjectButton
              alwaysShow
              object={{ id: data.structureKind.id }}
            />

            <FormSheet
              trigger={<PageAction>Edit</PageAction>}
              onSubmit={() => refetch()}
            >
              <UpdateStructureKindForm
                structureKind={data.structureKind}
              />
            </FormSheet>
          </>
        }
      >
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.structureKind.identifier}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              {data.structureKind.description}
            </p>
          </div>
          <div className="w-full h-full flex-row relative">
            {data.structureKind?.image && (
              <WithKraphMediaUrl media={data.structureKind.image}>
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
            <div className="flex-grow w-full">
            <StructureList kind={data.structureKind}/>
          </div>

      </KraphStructureKind.ModelPage>
    );
  },
);
export default Page;
