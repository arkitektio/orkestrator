import React, { useState, useEffect } from "react";
import { PageLayout } from "../../layout/PageLayout";
import { Allotment } from "allotment";
import { Pane, PaneProps } from "./Pane";
import { useSearchParams } from "react-router-dom";

export interface SearchHomeProps {}

const paramsToInitialValues = (params: URLSearchParams) => {
  let mapped: { [key: string]: { [key: string]: any } } = {};
  params.forEach((value, key: string) => {
    let x = key.split("_");
    mapped[x[0]] = { ...mapped[x[0]], [x[1]]: value, label: x[0] };
  });
  console.log(mapped);
  return mapped;
};

export interface PaneState {
  label: string;
  initialValues: { [key: string]: any };
}

const paramsToPanes = (params: URLSearchParams) => {
  let mapped: PaneState[] = [];

  params.forEach((value, key: string) => {
    let x = key.split("_");
    let isItem = mapped.find((p) => p.label === x[0]);
    if (!isItem) {
      mapped.push({ label: x[0], initialValues: { [x[1]]: value } });
    } else {
      isItem.initialValues[x[1]] = value;
    }
  });

  console.log(mapped);

  if (mapped.length === 0) {
    mapped.push({ label: "default", initialValues: { search: "" } });
  }

  return mapped;
};

const panesToParams = (mapped: PaneState[]) => {
  let params: { [key: string]: string } = {};
  mapped.forEach((pane) => {
    Object.keys(pane.initialValues).forEach((key) => {
      params[`${pane.label}_${key}`] = pane.initialValues[key];
    });
  });
  return params;
};

export const SearchHome: React.FC<SearchHomeProps> = (props) => {
  let [searchParams, setSearchParams] = useSearchParams();
  const [panes, setPanes] = useState<PaneState[]>(paramsToPanes(searchParams));

  const bakeLink = () => {
    const params = panesToParams(panes);
    setSearchParams(params);
  };

  return (
    <PageLayout>
      <div className="flex flex-col h-full">
        <div className="flex-row justify-between mr-2">
          <button
            type="button"
            className="text-primary-300 mr-3"
            onClick={() =>
              setPanes([
                ...panes,
                { label: `${panes.length + 1}`, initialValues: { search: "" } },
              ])
            }
          >
            Add Pane
          </button>
          <button
            type="button"
            className="text-primary-300"
            onClick={() => bakeLink()}
          >
            Bake Link
          </button>
        </div>
        <Allotment>
          {panes.map((pane, index) => (
            <div key={index} className="p-3 flex flex-col">
              {panes.length > 1 && (
                <button
                  type="button"
                  className="text-white flex-initial"
                  onClick={() =>
                    setPanes((panes) =>
                      panes.filter((p) => p.label != pane.label)
                    )
                  }
                >
                  Delete Pane
                </button>
              )}
              <div className="flex-shrink flex flex-col">
                <Pane
                  {...pane}
                  onSubmit={(v) => {
                    console.log(index, v);
                  }}
                  key={index}
                />
              </div>
            </div>
          ))}
        </Allotment>
      </div>
    </PageLayout>
  );
};
