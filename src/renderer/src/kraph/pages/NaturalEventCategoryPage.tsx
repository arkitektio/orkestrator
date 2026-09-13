import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Card } from "@/components/ui/card";
import { DragZone } from "@/components/upload/drag";
import { useKraphMediaUpload } from "@/datalayer/hooks/useKraphMediaUpload";
import { KraphNaturalEventCategory } from "@/linkers";
import {
  NaturalEventCategoryFragment,
  useGetNaturalEventCategoryQuery,
  useUpdateNaturalEventCategoryMutation,
} from "../api/graphql";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

export type IRepresentationScreenProps = {};

// An event category's roles are read-only here now.
//
// `UpdateNaturalEventCategoryInput` carries decoration only — key, label,
// description, colour, image, ontology references, pin. `kind`, `inputs`,
// `outputs` and `properties` are set when the category is created (they are on
// `CreateNaturalEventCategoryInput`) or by the bulk materialize path, and the
// update mutation no longer accepts them. The editor that used to live here
// submitted all four and would now be rejected, so it shows what the category
// declares instead of pretending to change it.
export const RoleOverview = ({
  naturalEventCategory,
}: {
  naturalEventCategory: NaturalEventCategoryFragment;
}) => {
  const columns: [string, NaturalEventCategoryFragment["inputs"]][] = [
    ["Inputs", naturalEventCategory.inputs],
    ["Outputs", naturalEventCategory.outputs],
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6 p-6">
      {columns.map(([heading, roles]) => (
        <div key={heading} className="flex flex-col gap-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {heading}
          </div>
          {roles.length === 0 && (
            <div className="text-sm text-muted-foreground">None declared</div>
          )}
          {roles.map((role) => (
            <Card key={role.key} className="p-3 flex flex-col gap-1">
              <div className="text-sm font-medium">{role.role}</div>
              {role.descriptor.keys && role.descriptor.keys.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  accepts {role.descriptor.keys.join(", ")}
                </div>
              )}
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
};

export default asDetailQueryRoute(
  useGetNaturalEventCategoryQuery,
  ({ data, refetch }) => {
    const uploadFile = useKraphMediaUpload();
    const [update] = useUpdateNaturalEventCategoryMutation();

    const createFile = async (file: File) => {
      const response = await uploadFile(file);
      if (response) {
        await update({
          variables: {
            input: { id: data.naturalEventCategory.id, image: response },
          },
        });
        await refetch();
      }
    };

    return (
      <KraphNaturalEventCategory.ModelPage
        title={data?.naturalEventCategory?.label}
        object={{ id: data.naturalEventCategory.id }}
        actions={
          <KraphNaturalEventCategory.Actions
            object={data.naturalEventCategory.id}
          />
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <KraphNaturalEventCategory.Knowledge
                object={{ id: data.naturalEventCategory.id }}
              />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.naturalEventCategory.label}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              {data.naturalEventCategory.description}
            </p>
          </div>
          <div className="w-full h-full flex-row relative">
            {data.naturalEventCategory?.image && (
              <WithKraphMediaUrl media={data.naturalEventCategory.image}>
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
        </div>

        <DragZone uploadFile={uploadFile} createFile={createFile} />

        <RoleOverview naturalEventCategory={data.naturalEventCategory} />
      </KraphNaturalEventCategory.ModelPage>
    );
  },
);
