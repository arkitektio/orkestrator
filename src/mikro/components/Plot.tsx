import { gql } from "@apollo/client";
import { Form, Formik } from "formik";
import React, { useEffect, useState } from "react";
import { RiArrowDownFill, RiPlayFill, RiStopFill } from "react-icons/ri";
import { useAlert } from "../../components/alerter/alerter-context";
import { SubmitButton } from "../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../components/forms/fields/text_input";
import { PageLayout } from "../../layout/PageLayout";
import { useDetailPlotQuery, useUpdatePlotMutation } from "../api/graphql";
import { useMikro, withMikro } from "../MikroContext";
import { MikroIQLField } from "./iql/MikroIQLField";
import { parseQueryData } from "./plot/parser";
import { Tree } from "./plot/Tree";
import { PlotTree } from "./plot/types";

export interface PlotProps {
  id: string;
}

export const Renderer = (props: {
  query: string | undefined;
  name: string | undefined;
}) => {
  const { client } = useMikro();
  const { alert } = useAlert();

  const [tree, setTree] = useState<PlotTree | undefined>(undefined);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating((gen) => true);
    try {
      client
        ?.query({
          query: gql(props.query || ""),
          fetchPolicy: "no-cache",
        })
        .then((data) => {
          if (data) {
            try {
              console.log("data", data);
              let tree = parseQueryData(data.data);
              console.log("Updating tree", tree);
              setTree(tree);
              setGenerating((gen) => false);
            } catch (e) {
              console.error(e);
              alert({
                message: (e as any).message,
              });
            }
          }
        })
        .catch((err) => {
          console.log(err);
        });
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (!autoGenerate) {
      generate();
    }
    if (autoGenerate) {
      const timeout = setInterval(() => {
        generate();
        console.log("auto update");
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [props.query, autoGenerate]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-initial text-white text-3xl pb-2 flex flex-row">
        <div className="flex-initial">{props.name || "Untitled"}</div>
        <div className="flex-grow"></div>
        <div className="flex-initial">
          <button
            onClick={() => generate()}
            className={`transition-colors ease-in-out  ${
              generating ? "text-orange-300" : "text-gray-300"
            }`}
          >
            <RiArrowDownFill />
          </button>
          <button onClick={() => setAutoGenerate(!autoGenerate)}>
            {autoGenerate ? (
              <RiPlayFill className="text-green-400" />
            ) : (
              <RiStopFill className="text-red-300" />
            )}
          </button>
        </div>
      </div>
      <div className="flex-grow flex flex-wrap dark:text-white">
        {tree ? <Tree group={tree} /> : "Loading..."}
      </div>
    </div>
  );
};

export const Plot: React.FC<PlotProps> = (props) => {
  const { data } = withMikro(useDetailPlotQuery)({
    variables: { id: props.id },
  });

  const [updatePlot] = withMikro(useUpdatePlotMutation)({});

  const [currentQuery, setCurrentQuery] = useState<string | undefined>(
    data?.plot?.query
  );

  const onSave = () => {
    updatePlot({
      variables: {
        id: props.id,
        query: currentQuery || "",
      },
    });
  };

  useEffect(() => {
    if (data?.plot?.query) {
      setCurrentQuery(data.plot.query);
    }
  }, [data]);

  return (
    <PageLayout
      width="w-[400px]"
      sidebar={
        <div className="p-4 flex flex-col h-full">
          <div className="flex-grow">
            {data?.plot?.query && (
              <Formik
                initialValues={{
                  query: data.plot?.query,
                  name: data.plot?.name,
                }}
                onSubmit={(values, helpers) => {
                  helpers.setSubmitting(true);
                  setCurrentQuery(values.query);
                  helpers.setSubmitting(false);
                }}
              >
                <Form>
                  <div className="w-full text-white">
                    <TextInputField
                      name="name"
                      label="Name"
                      description="How should this plot be called?"
                    />
                    <div className="h-[50vh] w-full">
                      <MikroIQLField
                        name="query"
                        initialQuery={data.plot.query}
                      />
                    </div>
                  </div>
                  <SubmitButton className="w-full mt-2 bg-primary-300 py-1 rounded-lg hover:bg-primary-500 disabled:bg-gray-300 ">
                    {" "}
                    Generate{" "}
                  </SubmitButton>
                </Form>
              </Formik>
            )}
          </div>
          <div className="flex-initial">
            <button
              className="w-full mt-2 bg-primary-300 py-1 rounded-lg hover:bg-primary-500 "
              onClick={onSave}
            >
              Save{" "}
            </button>
          </div>
        </div>
      }
    >
      <Renderer query={currentQuery} name={data?.plot?.name} />
    </PageLayout>
  );
};
