import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ListRender } from "@/core/layout/ListRender";
import { Sidebars } from "@/core/layout/Sidebars";
import { useActionDescription } from "@/core/ports/engine/ActionDescription";
import { KabinetDefinition } from "@/core/linkers";
import { useCallback } from "react";
import { useGetDefinitionQuery } from "../api/graphql";
import FlavourCard from "../components/cards/FlavourCard";
import { DefinitionLogo } from "../components/logo/KabinetBlokLogo";
import { KABINET_HELP } from "../help";

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
        help={KABINET_HELP.definition}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <KabinetDefinition.Knowledge object={data?.definition} />
            </Sidebars.Tab>
          </Sidebars>
        }
        pageActions={<></>}
      >
        <div className="p-3">
          <div>
            <div className="flex items-center gap-4">
              <DefinitionLogo definition={data.definition} className="size-10 rounded-lg" />
              <h1
                className="text-2xl font-bold tracking-tight cursor-pointer"
                onClick={copyHashToClipboard}
              >
                {data?.definition?.name}
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <div className="px-3 pb-3">
          <ListRender array={data?.definition?.flavours} title="Flavours">
            {(item, key) => <FlavourCard item={item} key={key} />}
          </ListRender>
        </div>
      </KabinetDefinition.ModelPage>
    );
  },
);


export default DefinitionPage;
