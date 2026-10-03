import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { LoadingPage } from "@/core/layout/fallbacks/LoadingPage";
import { LOK_HELP } from "../help";
import { Sidebars } from "@/core/layout/Sidebars";
import { LokUser } from "@/core/linkers";
import { useMeQuery } from "../api/graphql";
import { MorseCodeRecorder } from "../components/MorseCodeRecorder";

// (legacy) export type removed – not used

const Page = () => {
  const { data, error, refetch } = useMeQuery();

  if (error && !data) return <QueryError error={error} onRetry={() => refetch()} />;
  if (!data) {
    return <LoadingPage />;
  }

  return (
    <LokUser.ModelPage
      help={LOK_HELP.record}
      object={data.me}
      actions={<LokUser.Actions object={data.me} />}
      pageActions={<LokUser.ObjectButton alwaysShow object={data.me} />}
      title={data?.me?.username}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <LokUser.Knowledge object={data.me} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      {/* Profile Hero Section */}
      <MorseCodeRecorder />

    </LokUser.ModelPage >
  );
}

export default Page;
