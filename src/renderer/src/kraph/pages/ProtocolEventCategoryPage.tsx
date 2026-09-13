import { EnhanceButton } from "@/alpaka/components/EnhanceButton";
import { ImageCreator } from "@/alpaka/components/ImageCreator";
import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { FormSheet } from "@/components/dialog/FormDialog";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { DragZone } from "@/components/upload/drag";
import { useKraphMediaUpload } from "@/datalayer/hooks/useKraphMediaUpload";
import {
  KraphProtocolEventCategory,
  KraphProtocolStepTemplate,
} from "@/linkers";
import {
  useGetProtocolEventCategoryQuery,
  useUpdateProtocolEventCategoryMutation,
} from "../api/graphql";
import LoadingCreateProtocolEventForm from "../forms/LoadingCreateProtocolEventForm";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

const Page =  asDetailQueryRoute(
  useGetProtocolEventCategoryQuery,
  ({ data, refetch }) => {
    const uploadFile = useKraphMediaUpload();
    const [update] = useUpdateProtocolEventCategoryMutation();

    const createFile = async (file: File) => {
      const response = await uploadFile(file);
      if (response) {
        await update({
          variables: {
            input: { id: data.protocolEventCategory.id, image: response },
          },
        });
        await refetch();
      }
    };

    return (
      <KraphProtocolEventCategory.ModelPage
        title={data?.protocolEventCategory?.label}
        object={{ id: data.protocolEventCategory.id }}
        actions={
          <KraphProtocolEventCategory.Actions
            object={data.protocolEventCategory.id}
          />
        }
        pageActions={
          <div className="flex flex-row gap-2">
            <FormSheet
              trigger={
                <Button variant="outline" size="sm">
                  {" "}
                  Perform {data.protocolEventCategory.label}
                </Button>
              }
              onSubmit={() => refetch()}
            >
              <LoadingCreateProtocolEventForm
                rolemap={{}}
                id={data.protocolEventCategory.id}
              />
            </FormSheet>
            <EnhanceButton identifier="@kraph/protocoleventcategory" object={{ id: data.protocolEventCategory.id }} />
          </div>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <KraphProtocolStepTemplate.Knowledge
                object={{ id: data.protocolEventCategory.id }}
              />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div className="w-full h-full relative flex items-center justify-center min-h-[300px]">
            {data.protocolEventCategory?.image ? (
              <WithKraphMediaUrl media={data.protocolEventCategory.image}>
                {(url) => (
                  <img
                    src={url}
                    style={{ filter: "brightness(0.7)" }}
                    className="object-cover h-full w-full absolute top-0 left-0 rounded rounded-lg"
                  />
                )}
              </WithKraphMediaUrl>
            ) : (
              <ImageCreator
                kind="Category"
                prompt={
                  data.protocolEventCategory.description ||
                  "A scientific category"
                }
                onCreate={createFile}
              />
            )}
          </div>
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.protocolEventCategory.label}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              {data.protocolEventCategory.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col">
          {data.protocolEventCategory.inputs.map((role) => (
            <div key={role.role}> Source Role: {role.role}</div>
          ))}
        </div>
        <div className="flex flex-col">
          {data.protocolEventCategory.outputs.map((role) => (
            <div key={role.role}> Target Role: {role.role}</div>
          ))}
        </div>

        <DragZone uploadFile={uploadFile} createFile={createFile} />


      </KraphProtocolEventCategory.ModelPage>
    );
  },
);


export default Page;
