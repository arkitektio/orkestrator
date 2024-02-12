import { withOmeroArk } from "@jhnnsrs/omero-ark";
import React from "react";
import { useParams } from "react-router";
import { PageLayout } from "../../layout/PageLayout";
import { OmeroArkImage } from "../../linker";
import {
  useGetImageQuery
} from "../api/graphql";
import { OpenOmeroLink } from "../components/OpenOmeroLink";
import AuthorizedImage from "../components/Thumbnail";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;

  const { data } = withOmeroArk(useGetImageQuery)({
      variables: {id},
    },
  );


  return (
    <PageLayout actions={<OmeroArkImage.Actions object={id} />} >
      
         <div className="flex @2xl:flex-row-reverse flex-col rounded-md gap-4 mt-2 w-full">
            <div className="flex-1 overflow-hidden ">
              <div
                className=" group overflow-hidden rounded rounded-md shadow shadow-xl relative"
              >
                <AuthorizedImage id={id} className="w-full h-full rounded rounded-md" size={1000} />
              </div>
            </div>
            <div className="flex-1 flex flex-col @container ">
              <div className="flex-initial bg-white rounded p-3 @container">
              <div className="text-3xl">
                  {data?.image?.name} 
                </div>
              <div className="flex flex-col p-3 rounded rounded-md mt-2 mb-2">
                <div className="font-light mt-2 ">Acquired At</div> <div className="font-semibold mt-2 ">{data?.image?.acquisitionDate}</div>

                <div className="font-light mt-2 ">Tags</div>
                <div className="text-xl flex mb-2">
                  {data?.image?.tags?.map((tag, index) => (
                    <>
                      <span className="font-semibold mr-2">#{tag} </span>
                    </>
                  ))}
                </div>
                <OpenOmeroLink url={`webclient/img_detail/${id}/`}> Open in WebViewer </OpenOmeroLink>
                
              </div>
            </div>
            </div>
          </div>

    </PageLayout>
  );
};

export default Page;
