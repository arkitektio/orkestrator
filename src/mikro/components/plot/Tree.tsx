import { Form, Formik } from "formik";
import React from "react";
import { VscGraphLine } from "react-icons/vsc";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { SelectInputField } from "../../../components/forms/fields/select_input";
import { PopMenu } from "../../../layout/PopMenu";
import { getDefaultSmartModel } from "../../../linker";
import { GroupScreen } from "../../../pages/detail/GroupScreen";
import {
  AvailableCharts,
  getMatchableChart,
  MatchableChart,
} from "../charts/builder";
import { Smart } from "../charts/generic/Smart";
import { Group } from "./types";

export interface TreeProps {
  group: Group;
  depth?: number;
  index?: number;
}

export const EmptyLeaf = (props: TreeProps) => {
  const { group } = props;
  return (
    <div>
      <div>{group.name}empty</div>
      <div>{group.object}</div>
    </div>
  );
};

export const Tree: React.FC<TreeProps> = ({ group, depth = 0, index = 0 }) => {
  const Model = buildSmartModel(group.type, group.object);

  const charts = getMatchableChart(group);

  const [chart, setChart] = React.useState<AvailableCharts | undefined>(
    charts.at(0)?.value
  );

  const onSubmit = (values: any) => {
    setChart(values.chart);
  };

  return (
    <div className={`flex-1 flex flex-col ${!group.omit ? " " : ""}`}>
      {!group.omit && (
        <div className="flex flex-grow flex-col mb-2">
          <Model.Smart className="flex flex-row bg-gray-800 rounded-md mb-1">
            <div className="flex-grow text-xl text-white my-auto px-1">
              {" "}
              {group.name}
            </div>
            <PopMenu
              labelClassName="text-white py-auto flex-initial cursor-pointer"
              label={<VscGraphLine className="mt-2 mr-2" />}
            >
              {charts.length > 0 && (
                <Formik
                  initialValues={{
                    chart: charts.at(0)?.value,
                  }}
                  onSubmit={onSubmit}
                >
                  {(formik) => (
                    <Form>
                      <ChangeSubmitHelper />
                      <div className="bg-slate-600 p-3 rounded">
                        <div className="w-full text-white bg-slate-600">
                          <SelectInputField
                            name="chart"
                            label="Chart"
                            options={charts}
                          />
                        </div>
                      </div>
                    </Form>
                  )}
                </Formik>
              )}
            </PopMenu>
          </Model.Smart>
          <MatchableChart kind={chart} group={group} />
        </div>
      )}
      {group.groups && group.groups.length > 0 && (
        <div className={"flex-grow flex flex-wrap gap-2"}>
          {group.groups?.map((subgroup, index) => (
            <Tree group={subgroup} depth={depth + 1} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

export const buildSmartModel = (
  type: string | undefined,
  object: string | undefined
) => {
  let SmartModel: any = null;

  if (type) {
    if (type == "Sample") {
      SmartModel = getDefaultSmartModel("@mikro/sample");
    }
    if (type == "Representation") {
      SmartModel = getDefaultSmartModel("@mikro/representation");
    }
    if (type == "Label") {
      SmartModel = getDefaultSmartModel("@mikro/label");
    }
    if (type == "Feature") {
      SmartModel = getDefaultSmartModel("@mikro/feature");
    }
  }

  if (SmartModel != null && object) {
    return {
      Smart: (props: any) => <SmartModel.Smart object={object} {...props} />,
      DetailLink: (props: any) => (
        <SmartModel.DetailLink object={object} {...props} />
      ),
      ListLink: (props: any) => <SmartModel.ListLink {...props} />,
      link: () => SmartModel.linkBuilder(object),
    };
  }

  return {
    ListLink: (props: any) => (
      <div className={props.className}>{props.children}</div>
    ),
    DetailLink: (props: any) => (
      <div className={props.className}>{props.children}</div>
    ),
    Smart: (props: any) => (
      <div className={props.className}>{props.children}</div>
    ),
    link: () => "string",
  };
};
