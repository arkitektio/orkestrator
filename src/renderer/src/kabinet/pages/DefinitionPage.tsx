import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { ListRender } from "@/components/layout/ListRender";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { useActionDescription } from "@/lib/ports/ActionDescription";
import { KabinetDefinition } from "@/linkers";
import { buildAssignInput } from "@/rekuest/assign";
import { useImplementationAction } from "@/rekuest/hooks/useImplementationAction";
import { useCallback } from "react";
import { useGetDefinitionQuery } from "../api/graphql";
import FlavourCard from "../components/cards/FlavourCard";

export const AssignButton = (props: {
  id: string;
  pod: string;
  refetch: () => void;
}) => {
  const { assign } = useImplementationAction({
    id: props.id,
  });

  const doassign = async () => {
    console.log(
      await assign(buildAssignInput({
        args: {
          pod: props.pod,
        },
      })),
      props.refetch(),
    );
  };

  return (
    <Button onClick={doassign} variant={"outline"} size="sm">
      Refresh
    </Button>
  );
};

export const DefinitionPage = asDetailQueryRoute(
  useGetDefinitionQuery,
  ({ data }) => {
    const description = useActionDescription({
      description: data.definition.description || "",
    });

    const copyHashToClipboard = useCallback(() => {
      navigator.clipboard.writeText(data?.definition?.hash || "");
    }, [data?.definition?.hash]);

    return (
      <KabinetDefinition.ModelPage
        title={data?.definition?.name}
        object={data?.definition}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <KabinetDefinition.Knowledge object={data?.definition} />
            </Sidebars.Tab>
          </Sidebars>
        }
        pageActions={<></>}
      >
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div className="mb-3">
            <h1
              className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl cursor-pointer"
              onClick={copyHashToClipboard}
            >
              {data?.definition?.name}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground max-w-[80%]">
              {description}
            </p>
          </div>
        </div>
        <div className="p-6">
          <ListRender array={data?.definition?.flavours} title="Flavours">
            {(item, key) => <FlavourCard item={item} key={key} />}
          </ListRender>
        </div>
      </KabinetDefinition.ModelPage>
    );
  },
);


export default DefinitionPage;
