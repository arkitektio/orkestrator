import { Form, Formik } from "formik";
import React, { useState } from "react";
import { BsPinAngle, BsPinFill, BsTrash } from "react-icons/bs";
import { useNavigate } from "react-router";
import Timestamp from "react-timestamp";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ParagraphInputField } from "../../components/forms/fields/paragraph_input";
import { CreateableSearchSelect } from "../../components/forms/fields/search_select_input";
import { TextInputField } from "../../components/forms/fields/text_input";
import { DropZone } from "../../components/layout/DropZone";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { SelfActions } from "../../components/SelfActions";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { linkableModelToIdentifier, MikroFile, Sample } from "../../linker";
import { structure_to_widget } from "../../rekuest/widgets/returns/fallbacks/StructureReturnWidget";
import {
  CommentableModels,
  DetailExperimentDocument,
  UpdateExperimentMutationVariables,
  useDeleteSampleMutation,
  useDetailExperimentQuery,
  usePinExperimentMutation,
  useTagSearchLazyQuery,
  useUpdateExperimentMutation,
  useAssociateSamplesMutation,
  useAssociateFilesMutation,
  useUnassociateFilesMutation,
  useUnassociateSamplesMutation,
  useUploadOmeroFileMutation,
  DetailExperimentQuery,
  useDetailContextQuery,
  useDetailModelQuery,
  useDetailLinkQuery,
} from "../api/graphql";
import { withMikro } from "../MikroContext";
import { ContextCard } from "./cards/ContextCard";
import { UploadZone } from "./UploadZone";

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
            <MikroKomments id={id} model={CommentableModels.GrunnlagDatalink} />
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
              <ContextCard context={data?.link?.context} />
            )}
          </div>
          <div className="flex flex-row">
            {leftIdentifier && (
              <div className="flex-1 text-slate-200">
                <div className="font-semibold ">Left</div>
                {structure_to_widget(leftIdentifier, {
                  value: data?.link?.xId,
                  minimal: false,
                  label: true,
                  link: true,
                })}
              </div>
            )}
            <div className="flex-initial ml-1 font-light my-auto font-semibold text-slate-200 mx-2">
              {">"}
            </div>
            {rightIdentifier && (
              <div className="flex-1 text-slate-200">
                <div className="font-semibold ">Right</div>
                {structure_to_widget(rightIdentifier, {
                  value: data?.link?.yId,
                  minimal: false,
                  label: true,
                  link: true,
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export { Link };
