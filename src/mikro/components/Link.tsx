import React from "react";
import { SelfActions } from "../../components/SelfActions";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { MikroLink, linkableModelToIdentifier } from "../../linker";
import { PortKind } from "../../rekuest/api/graphql";
import { structure_to_widget } from "../../rekuest/widgets/returns/fallbacks/StructureReturnWidget";
import { withMikro } from "../MikroContext";
import { CommentableModels, useDetailLinkQuery } from "../api/graphql";
import { ContextCard } from "./cards/ContextCard";

export type IExperimentProps = {
  id: string;
};

const Link: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailLinkQuery)({
    variables: { id: id },
  });

  let leftIdentifier =
    data?.link?.leftType && linkableModelToIdentifier(data?.link?.leftType);
  let rightIdentifier =
    data?.link?.rightType && linkableModelToIdentifier(data?.link?.rightType);

  return (
    <PageLayout
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroLink id={id} model={CommentableModels.GrunnlagDatalink} />
          ),
          key: "comments",
        },
      ]}
      actions={<SelfActions type="@mikro/link" object={id} />}
    >
      {!error && data && (
        <div className="p-3 flex-grow flex flex-col">
          <div className="flex">
            <SectionTitle>{data?.link?.relation.name}</SectionTitle>
          </div>
          <SectionTitle>Applies to context</SectionTitle>
          <div className="flex">
            {data?.link?.context && (
              <ContextCard context={data?.link?.context} mates={[]} />
            )}
          </div>
          <div className="flex flex-row">
            {leftIdentifier && data?.link?.xId && (
              <div className="flex-1 text-slate-200">
                <div className="font-semibold ">Left</div>
                {structure_to_widget(
                  {
                    identifier: leftIdentifier,
                    key: "left",
                    nullable: false,
                    kind: PortKind.Structure,
                  },
                  {
                    value: data?.link?.xId,
                    minimal: false,
                    label: true,
                    link: true,
                  }
                )}
              </div>
            )}
            <div className="flex-initial ml-1 font-light my-auto font-semibold text-slate-200 mx-2">
              {">"}
            </div>
            {rightIdentifier && data?.link?.yId && (
              <div className="flex-1 text-slate-200">
                <div className="font-semibold ">Right</div>
                {structure_to_widget(
                  {
                    identifier: rightIdentifier,
                    key: "left",
                    nullable: false,
                    kind: PortKind.Structure,
                  },
                  {
                    value: data?.link?.yId,
                    minimal: false,
                    label: true,
                    link: true,
                  }
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export { Link };
