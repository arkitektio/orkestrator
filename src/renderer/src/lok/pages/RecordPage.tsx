import { LoadingPage } from "@/app/components/fallbacks/LoadingPage";
import { Sidebars } from "@/components/layout/Sidebars";
import { LokUser } from "@/linkers";
import { useMeQuery } from "../api/graphql";
import { MorseCodeRecorder } from "../components/MorseCodeRecorder";

// (legacy) export type removed – not used

const Page = () => {
  const { data } = useMeQuery();

  if (!data) {
    return <LoadingPage />;
  }

  return (
    <LokUser.ModelPage
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
