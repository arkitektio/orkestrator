
import { withOmeroArk } from "@jhnnsrs/omero-ark";
import React from "react";
import { useParams } from "react-router";
import { PageLayout } from "../../layout/PageLayout";
import { ListRender } from "../../layout/SectionTitle";
import { OmeroArkDataset } from "../../linker";
import {
  useGetDatasetQuery
} from "../api/graphql";
import ImageCard from "../components/cards/ImageCard";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;

  const { data } = withOmeroArk(useGetDatasetQuery)({
      variables: {id},
    },
  );

  return (
    <PageLayout actions={<OmeroArkDataset.Actions object={id} />}>
      <div className="p-3 @container">
        <div>
          <div
          >
            {data?.dataset?.name}
          </div>
        </div>
        <div className="flex flex-col p-3 rounded rounded-md mt-2 mb-2">
          <div className="font-light mt-2 ">Created At</div>
          <div className="font-light mt-2 ">Created by</div>

          <div className="font-light mt-2 ">Tags</div>
          <div className="text-xl flex mb-2">
          </div>
        </div>
        <ListRender
          title="Contained Images"
          array={data?.dataset?.images}
        >
          {(item, index) => <ImageCard image={item} key={index} />}
        </ListRender>
      </div>
    </PageLayout>
  );
};

export default Page;
