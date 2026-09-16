import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { LovekitStream } from "@/linkers";
import { useGetStreamQuery } from "../api/graphql";

export default asDetailQueryRoute(
  useGetStreamQuery,
  ({ data }) => {
    return (
      <LovekitStream.ModelPage
        title="Stream"
        object={data.stream}
        pageActions={
          <div className="flex flex-row gap-2">
            <LovekitStream.ObjectButton object={data.stream} />
          </div>
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
