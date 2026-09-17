import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Card } from "@/components/ui/card";
import { RekuestMemoryShelve } from "@/linkers";
import {
  useMemoryShelveQuery
} from "@/rekuest/api/graphql";
import { BellIcon } from "lucide-react";


export const MemoryShelvePage = asDetailQueryRoute(
  useMemoryShelveQuery,
  ({ data }) => {

    return (
      <RekuestMemoryShelve.ModelPage
        title={data.memoryShelve.name}
        object={data.memoryShelve}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <RekuestMemoryShelve.Knowledge object={data?.memoryShelve} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >


        <div className="p-6 mt-2">
          {data.memoryShelve.drawers.map((d) => (
            <Card key={d.id} className="mb-4">
              <div className="flex flex-row justify-between">
                <div className="flex flex-row gap-2">
                  <BellIcon className="h-6 w-6 text-foreground" />
                  <p className="text-xl font-semibold text-foreground">
                    {d.label} {d.resourceId}
                  </p>
                </div>
              </div>
            </Card>
          ))}

        </div>
      </RekuestMemoryShelve.ModelPage>
    );
  },
);


export default MemoryShelvePage;
