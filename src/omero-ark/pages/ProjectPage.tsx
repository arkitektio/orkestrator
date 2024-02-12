import { withOmeroArk } from "@jhnnsrs/omero-ark";
import React from "react";
import { useNavigate, useParams } from "react-router";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { ListRender } from "../../layout/SectionTitle";
import { OmeroArkDataset, OmeroArkProject } from "../../linker";
import { useOpenInOmeroMate } from "../../mates/omeroweb/useOpenInOmeroMate";
import { useDialog } from "../../providers/dialog/DialogProvider";
import {
  useGetProjectQuery
} from "../api/graphql";
import DatasetCard from "../components/cards/DatasetCard";
import { CreateDatasetDialog } from "../components/dialogs/CreateDatasetDialog";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;

  const { data } = withOmeroArk(useGetProjectQuery)({
      variables: {id},
    },
  );

  const {ask}= useDialog();
  const navigate = useNavigate();
    const mate = useOpenInOmeroMate();

  return (
    <PageLayout actions={<><ActionButton
      label="Create new Dataset"
      onAction={async () => {
        let x = await ask(CreateDatasetDialog, {projectId: id});
        if (x.res.createDataset) {
          navigate(OmeroArkDataset.linkBuilder(x.res.createDataset?.id));
        }
      }}
    /><OmeroArkProject.Actions object={id} /></>}>
      <div className="p-3 @container">
        <div className="flex bg-white dark:bg-gray-100 rounded rounded-md p-3 mb-2 flex-col">
          <div className="text-2xl font-light">
              {data?.project?.name}
          </div>
          <div className="font-light mt-2 ">
              {data?.project?.description}
          </div>
          <div className="flex flex-col rounded rounded-md">
            <div className="font-light mt-2 ">Created At</div>
            <div className="font-light mt-2 ">Created by</div>

            <div className="font-light mt-2 ">Tags</div>
            <div className="text-xl flex mb-2">
              {data?.project?.tags?.map((tag, index) => (
                <>
                  <span className="font-semibold mr-2">#{tag} </span>
                </>
              ))}
            </div>
          </div>
        </div>
        <ListRender
          title="Contained Dataset"
          array={data?.project?.datasets}
        >
          {(item, index) => <DatasetCard dataset={item} key={index} mates={[mate(`webclient/?show=dataset-${item.id}`)]}/>}
        </ListRender>
      </div>
    </PageLayout>
  );
};

export default Page;
