import { PageSections } from "@/core/layout/PageSections";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { FormSheet } from "@/core/dialogs/FormDialog";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageAction } from "@/core/ui/page-action";
import { DragZone } from "@/core/datalayer/upload/drag";
import { useKraphMediaUpload } from "@/kraph/datalayer/useKraphMediaUpload";
import {
  KraphProtocolEventCategory,
  KraphProtocolStepTemplate,
} from "@/core/linkers";
import {
  useGetProtocolEventCategoryQuery,
  useUpdateProtocolEventCategoryMutation,
} from "../api/graphql";
import LoadingCreateProtocolEventForm from "../forms/LoadingCreateProtocolEventForm";
import { WithKraphMediaUrl } from "@/kraph/datalayer/kraphAccess";

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
          <>
            <FormSheet
              trigger={
                <PageAction alwaysShow size="sm">
                  Perform {data.protocolEventCategory.label}
                </PageAction>
              }
              onSubmit={() => refetch()}
            >
              <LoadingCreateProtocolEventForm
                rolemap={{}}
                id={data.protocolEventCategory.id}
              />
            </FormSheet>
            {/* Whatever other modules add here (rekuest: "Enhance"). */}
            <PageSections
              placement="actions"
              identifier="@kraph/protocoleventcategory"
              object={{ id: data.protocolEventCategory.id }}
            />
          </>
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
              // No image yet: drop one below, or let an "Enhance" action make one.
              <div className="text-sm text-muted-foreground">No image yet</div>
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
