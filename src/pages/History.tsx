import React from "react";
import { useNavigate } from "react-router";
import Select from "react-select";
import {
  AssignationStatusInput,
  useFilteredAssignationsQuery,
} from "../arkitekt/api/graphql";
import { withArkitekt } from "../arkitekt/arkitekt";
import { Assignation } from "../linker";

const options = Object.values(AssignationStatusInput).map((val) => ({
  label: val,
  value: val,
}));

interface Props {}

export const History: React.FC<Props> = (props) => {
  const startc = [AssignationStatusInput.Critical];
  const defaultValue = {
    label: AssignationStatusInput.Critical,
    value: AssignationStatusInput.Critical,
  };

  const { data, refetch } = withArkitekt(useFilteredAssignationsQuery)({
    variables: { filter: startc },
  });

  const onChange = (options: any) => {
    const value = options.map((i: any) => i.value);
    console.log(value);
    refetch({ filter: value });
  };

  const navigate = useNavigate();

  return (
    <div className={"grid grid-cols-12 gap-5 h-screen"}>
      <div className={"col-span-1"}></div>
      <div className={"col-span-11"}>
        <Select
          onChange={onChange}
          isMulti={true}
          defaultValue={defaultValue}
          options={options}
          className="text-xs "
        />
        <div className="grid grid-cols-6 gap-5">
          {data?.myrequests?.map((ass: any) => (
            <Assignation.DetailLink
              className="mt-2 bg-white shadow-lg rounded p-5"
              object={ass.id}
            >
              Ass{ass?.node?.name}
            </Assignation.DetailLink>
          ))}
        </div>
      </div>
    </div>
  );
};
