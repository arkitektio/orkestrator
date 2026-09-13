import { asGraphDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { FormSheet } from "@/components/dialog/FormDialog";
import { Sidebars } from "@/components/layout/Sidebars";
import {
  KraphEntity,
  KraphProtocolEvent,
  KraphProtocolEventCategory
} from "@/linkers";
import { HobbyKnifeIcon } from "@radix-ui/react-icons";
import { useGetProtocolEventQuery } from "../api/graphql";

// Note: the backend no longer exposes `sourceParticipants` / `targetParticipants`
// / `variables` on `ProtocolEvent`, nor `plateChildren` on `ProtocolEventCategory`
// (both concepts have been fully removed from the schema), so the rich-text
// role-value editor that used to render here has been dropped.

const Page = asGraphDetailQueryRoute(
  useGetProtocolEventQuery,
  ({ data }) => {
    return (
      <KraphProtocolEvent.ModelPage
        object={{ id: data.protocolEvent.id }}
        title={data?.protocolEvent.label}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <KraphProtocolEvent.Knowledge object={{ id: data.protocolEvent.id }} />
            </Sidebars.Tab>
          </Sidebars>
        }
        pageActions={
          <div className="flex flex-row gap-2">
            <>
              <FormSheet trigger={<HobbyKnifeIcon />}>
                Not implemented
              </FormSheet>
            </>
          </div>
        }
      >
        <KraphEntity.Drop
          object={{ id: data.protocolEvent.id }}
          className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6"
        >
          <div>
            {/* A view draws an event under every category that admits it, so
                the heading is the drawn labels and the links below are one per
                category. */}
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.protocolEvent.categories.map((c) => c.label).join(" · ") ||
                data.protocolEvent.label}
            </h1>

            <p className="mt-3 text-xl text-muted-foreground"></p>
            <p className="mt-3 text-xl text-muted-foreground flex flex-row gap-2">
              {data.protocolEvent.categories.map((category) => (
                <KraphProtocolEventCategory.DetailLink
                  key={category.id}
                  object={{ id: category.id }}
                >
                  {category.label}
                </KraphProtocolEventCategory.DetailLink>
              ))}
            </p>
          </div>
        </KraphEntity.Drop>
      </KraphProtocolEvent.ModelPage>
    );
  },
);


export default Page;
