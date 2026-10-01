import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { LovekitStream } from "@/core/linkers";
import { useGetStreamQuery } from "../api/graphql";
import { LOVEKIT_HELP } from "../help";

export default asDetailQueryRoute(
  useGetStreamQuery,
  ({ data }) => {
    return (
      <LovekitStream.ModelPage
        help={LOVEKIT_HELP.stream}
        title="Stream"
        object={data.stream}
        pageActions={
          <>
            <LovekitStream.ObjectButton alwaysShow object={data.stream} />
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <LovekitStream.Knowledge object={data.stream} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        {data.stream.id}
      </LovekitStream.ModelPage>
    );
  },
);
