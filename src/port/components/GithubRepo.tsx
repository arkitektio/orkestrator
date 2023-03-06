import { useEffect, useState } from "react";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { RepoScan } from "../../linker";
import {
  useDetailContainerQuery,
  useStopContainerMutation,
  useRestartContainerMutation,
  useRemoveContainerMutation,
  useDetailWhaleQuery,
  useDetailGithubRepoQuery,
} from "../api/graphql";
import { withPort } from "../PortContext";
import { RepoScanCard } from "./cards/RepoScanCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type GithubRepoProps = {
  id: string;
};

export const DisplayMarkdown = (props: { link: string }) => {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    console.log(props.link);
    fetch(props.link)
      .then((response) => response.text())
      .then((text) => {
        setMarkdown(text);
      });
  }, [props.link]);

  return (
    <>
      {" "}
      {markdown && (
        <ReactMarkdown children={markdown} remarkPlugins={[remarkGfm]} />
      )}
    </>
  );
};

export const GithubRepo = (props: GithubRepoProps) => {
  const { data } = withPort(useDetailGithubRepoQuery)({
    variables: { id: props.id },
    pollInterval: 1000,
  });

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  return (
    <PageLayout>
      <SectionTitle>Github Repo </SectionTitle>
      <div className="text-white">
        <div className="text-2xl">
          {data?.githubRepo?.user}/{data?.githubRepo?.repo}:
          {data?.githubRepo?.branch}
        </div>
        <a
          href={`https://github.com/${data?.githubRepo?.user}/${data?.githubRepo?.repo}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open{" "}
        </a>
        {data?.githubRepo?.readme && (
          <DisplayMarkdown link={data?.githubRepo?.readme} />
        )}
      </div>
      <SectionTitle>Possible Deployments of this app</SectionTitle>
      <ResponsiveContainerGrid>
        {data?.githubRepo?.scans?.filter(notEmpty).map((scan, index) => (
          <RepoScanCard scan={scan} key={index} />
        ))}
      </ResponsiveContainerGrid>
    </PageLayout>
  );
};
