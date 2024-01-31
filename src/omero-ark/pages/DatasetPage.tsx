
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
    <PageLayout actions={<OmeroArkDataset.Actions object={id} />} >
      <div className="p-3 @container">
      <div className="flex bg-white dark:bg-gray-100 rounded rounded-md p-3 mb-2 flex-col">
          <div className="text-2xl font-light">
              {data?.dataset?.name}
          </div>
          <div className="font-light mt-2 ">
              {data?.dataset?.description}
          </div>
          <div className="flex flex-col rounded rounded-md">
            <div className="font-light mt-2 ">Created At</div>
            <div className="font-light mt-2 ">Created by</div>

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
