import { EnhanceButton } from "@/alpaka/components/EnhanceButton";
import { useDialog } from "@/app/dialog";
import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialogbutton";
import { DragZone } from "@/components/upload/drag";
import { useKraphMediaUpload } from "@/datalayer/hooks/useKraphMediaUpload";
import { KraphEntityCategory } from "@/linkers";
import { Plus, Settings2 } from "lucide-react";
import { useNavigate as useNavigateRouter } from "react-router-dom";
import {
  EntityNodesDocument,
  useAssertEntityExistsMutation,
  useGetEntityCategoryQuery,
  useUpdateEntityCategoryMutation,
} from "../api/graphql";
import { EntityList } from "../components/renderers/lists/EntityList";
import { EntityCategorySidebar } from "../sidebars/EntityCategorySidebar";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

export const Page = asDetailQueryRoute(
  useGetEntityCategoryQuery,
  ({ data, refetch }) => {
    const uploadFile = useKraphMediaUpload();
    const [update] = useUpdateEntityCategoryMutation();
    const navigateRouter = useNavigateRouter();

    const [quickCreate] = useAssertEntityExistsMutation({
      variables: {
        input: {
          // Claims name the word this category declares, not the category row.
          term: data.entityCategory.term?.key ?? data.entityCategory.key,
        },
      },
      refetchQueries: [{ query: EntityNodesDocument, variables: { entityCategory: data.entityCategory.id } }],
    });

    const { openSheet } = useDialog();

    const createFile = async (file: File) => {
      const response = await uploadFile(file);
      if (response) {
        await update({
          variables: {
            input: {
              id: data.entityCategory.id,
              image: response,
            },
          },
        });
        await refetch();
      }
    };

    const pin = async () => {
      await update({
        variables: {
          input: {
            id: data.entityCategory.id,
            pin: !data.entityCategory.pinned,
          },
        },
      });
      await refetch();
    };

    return (
      <KraphEntityCategory.ModelPage
        object={data.entityCategory}
        title={data?.entityCategory.label}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Stats">
              <EntityCategorySidebar category={data.entityCategory.id} />
            </Sidebars.Tab>
            <Sidebars.Tab label="Knowledge">
              <KraphEntityCategory.Knowledge object={data.entityCategory} />
            </Sidebars.Tab>
          </Sidebars>
        }
        pageActions={
          <>
            <Button
              onClick={() => {
                quickCreate().then(refetch);
              }}
              variant="outline"
            >
              Quick+
            </Button>
            <Button
              onClick={() => {
                pin().then(() => refetch());
              }}
              variant="outline"
            >
              {data.entityCategory.pinned ? "Unpin" : "Pin"}
            </Button>

            <DialogButton
              variant="outline"
              name="editentitycategory"
              dialogProps={{ entityCategory: data.entityCategory }}
            >
              Edit
            </DialogButton>
            <Button
              variant="outline"
              onClick={() => navigateRouter(`/kraph/entitycategories/${data.entityCategory.id}/schema`)}
            >
              <Settings2 className="h-3 w-3 mr-2" />
              Schema Builder
            </Button>
            <EnhanceButton identifier="@kraph/entitycategory" object={data.entityCategory} refetch={refetch} />

            <Button
              variant="outline"
              onClick={() =>
                openSheet("createentitywithproperties", {
                  category: data.entityCategory,
                }, { size: "large" })
              }
            >
              <Plus className="h-3 w-3 mr-2" />
              Create {data.entityCategory.label || "Entity"}
            </Button>
            <KraphEntityCategory.ObjectButton
              object={data.entityCategory}
            />
          </>
        }
      >
        <div className="p-6 flex flex-col flex-initial">
          <div className="col-span-4 mb-6 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center">
            <div>
              <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                {data.entityCategory.label} <div className="inline-block font-light text-gray-300">List </div>
              </h1>
              <p className="mt-3 text-xl text-muted-foreground">
                {data.entityCategory.description}
              </p>
            </div>
            <div className="w-full h-full flex-row relative">
              {data.entityCategory?.image && (
                <WithKraphMediaUrl media={data.entityCategory.image}>
                  {(url) => (
                    <img
                      src={url}
                      style={{ filter: "brightness(0.7)" }}
                      className="object-cover h-full w-full absolute top-0 left-0 rounded rounded-lg"
                    />
                  )}
                </WithKraphMediaUrl>
              )}
            </div>

            <DragZone uploadFile={uploadFile} createFile={createFile} />

          </div>
          <div className="flex-grow">

            <EntityList
              category={data.entityCategory}
            />
          </div>
        </div>
      </KraphEntityCategory.ModelPage>
    );
  },
);


export default Page;
