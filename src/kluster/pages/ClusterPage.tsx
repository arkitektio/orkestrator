import React from "react";
import { useParams } from "react-router";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { useDialog } from "../../providers/dialog/DialogProvider";
import { ScaleClusterDialog } from "../components/dialogs/ScaleClusterDialog";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
const { id } = useParams<{ id: string }>();

  const {ask} = useDialog();
  if (!id) return <></>;
  return (
    <PageLayout actions={<><ActionButton
      label="Scale Cluster"
      onAction={async () => {
        let x = await ask(ScaleClusterDialog, {id});
      }}
    /></>} >
      Cluster
    </PageLayout>
  );
};

export default Page;
