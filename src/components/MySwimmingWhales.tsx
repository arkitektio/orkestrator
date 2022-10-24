import React from "react";
import { ProvisionStatus } from "../rekuest/api/graphql";
import { usePostman } from "../rekuest/postman/graphql/postman-context";

export type IGeneratorsProps = {};

const MySwimmingWhales: React.FC<IGeneratorsProps> = ({}) => {
  const { provisions } = usePostman();

  const whaleProvisions = provisions?.provisions?.filter(
    (res) =>
      res?.template?.extensions?.includes("whale") &&
      res?.status == ProvisionStatus.Active
  );

  return (
    <>
      <span className="font-light text-xl">My Swimming Whales </span>
      <div className="pt-2 pb-2 grid grid-flow-col grid-cols-6 grid-rows-1 gap-4">
        {whaleProvisions?.map((prov, index) => (
          <div
            key={index}
            className="max-w-sm rounded overflow-hidden shadow-md bg-white"
          >
            <div className="p-2 ">
              <div className="text-xl font-light mb-2">{prov?.id}</div>
              <p className="text-gray-700 text-sm">
                {prov?.template?.registry?.app?.name}
              </p>
            </div>
            <div className="pl-2 pt-2 pb-2"></div>
          </div>
        ))}
      </div>
    </>
  );
};

export { MySwimmingWhales };
