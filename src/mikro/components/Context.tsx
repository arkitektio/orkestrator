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
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { Link, MikroFile, Model, Sample } from "../../linker";
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
} from "../api/graphql";
import { withMikro } from "../MikroContext";
import CommentSection from "./comments/CommentSection";
import { UploadZone } from "./UploadZone";

export type IExperimentProps = {
  id: string;
};

const Context: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailContextQuery)({
    variables: { id: id },
  });

  const [updateExperiment] = withMikro(useUpdateExperimentMutation)();
  const [pinExperiment] = withMikro(usePinExperimentMutation)();

  const { confirm } = useConfirm();

  return (
    <PageLayout
      sidebar={
        <div className="p-5">
          <CommentSection id={id} model={CommentableModels.GrunnlagContext} />
        </div>
      }
      actions={<SelfActions type="@mikro/context" object={id} />}
    >
      {!error && data && (
        <div className="p-3 flex-grow flex flex-col">
          <div className="flex mb-4">
            <SectionTitle>{data?.context?.name}</SectionTitle>
          </div>
          <SectionTitle> Relates </SectionTitle>
          <ResponsiveGrid>
            {data.context?.links.map((link) => (
              <Link.Smart
                object={link.id}
                className="flex flex-row p-2 bg-gray-800 truncate text-gray-200 rounded"
              >
                <Link.DetailLink object={link.id} className="flex-initial">
                  {link.relation}
                </Link.DetailLink>
                <div className="flex flex-row">
                  <div className="flex-initial ">{link.xId}</div>
                  <div className="flex-grow  flex text-bold ">
                    {" "}
                    {">"}
                    {link.relation} {">"}{" "}
                  </div>
                  <div className="flex-initial">{link.yId}</div>
                </div>
              </Link.Smart>
            ))}
          </ResponsiveGrid>
          <SectionTitle> Created Models </SectionTitle>
          <ResponsiveGrid>
            {data.context?.models.map((m) => (
              <Model.Smart
                object={m.id}
                className="flex flex-row p-2 bg-gray-800 truncate text-gray-200 rounded"
              >
                <Model.DetailLink object={m.id} className="flex-initial">
                  {m.name}
                </Model.DetailLink>
              </Model.Smart>
            ))}
          </ResponsiveGrid>
        </div>
      )}
    </PageLayout>
  );
};

export { Context };
