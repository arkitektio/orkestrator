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
import { MikroFile, Sample } from "../../linker";
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
import { UploadZone } from "./UploadZone";

export type IExperimentProps = {
  id: string;
};

const Link: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailLinkQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout
      sidebar={
        <div className="p-5">
          <MikroKomments id={id} model={CommentableModels.GrunnlagDatalink} />
        </div>
      }
      actions={<SelfActions type="@mikro/context" object={id} />}
    >
      {!error && data && (
        <div className="p-3 flex-grow flex flex-col">
          <div className="flex">
            <SectionTitle>{data?.link?.relation}</SectionTitle>
          </div>
          <div className="flex-grow text-white flex flex-col"></div>
          <div className="flex flex-row">
            <div className="flex-initial ">{data?.link?.xId}</div>
            <div className="flex-grow  flex text-bold ">
              {" "}
              {">"}
              {data?.link?.relation} {">"}{" "}
            </div>
            <div className="flex-initial">{data?.link?.yId}</div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export { Link };
