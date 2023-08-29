import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { useAppifyDeployment } from "../../mates/deployment/useAppifyDeployment";
import { withPort } from "../PortContext";
import {
  useDetailGithubRepoQuery,
  useRemoveContainerMutation,
  useRestartContainerMutation,
  useStopContainerMutation,
} from "../api/graphql";
import { DeploymentCard } from "./cards/DeploymentCard";

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

  const appifyDeployment = useAppifyDeployment();

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
        {data?.githubRepo?.deployments?.filter(notEmpty).map((dep, index) => (
          <DeploymentCard
            deployment={dep}
            key={index}
            mates={[appifyDeployment]}
          />
        ))}
      </ResponsiveContainerGrid>
    </PageLayout>
  );
};
