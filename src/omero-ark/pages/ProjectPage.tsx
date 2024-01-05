import { withOmeroArk } from "@jhnnsrs/omero-ark";
import React from "react";
import { useParams } from "react-router";
import { PageLayout } from "../../layout/PageLayout";
import { ListRender } from "../../layout/SectionTitle";
import { OmeroArkProject } from "../../linker";
import {
  useGetProjectQuery
} from "../api/graphql";
import DatasetCard from "../components/cards/DatasetCard";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;

  const { data } = withOmeroArk(useGetProjectQuery)({
      variables: {id},
    },
  );

  return (
    <PageLayout actions={<OmeroArkProject.Actions object={id} />}>
      <div className="p-3 @container">
        <div>
          <div
          >
            {data?.project?.name}
          </div>
        </div>
        <div className="flex flex-col  p-3 rounded rounded-md mt-2 mb-2">
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
        <ListRender
          title="Contained Dataset"
          array={data?.project?.datasets}
        >
          {(item, index) => <DatasetCard dataset={item} key={index} />}
        </ListRender>
      </div>
    </PageLayout>
  );
};

export default Page;