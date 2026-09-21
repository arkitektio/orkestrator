import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { ListRender } from "@/components/layout/ListRender";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { SheetButton } from "@/components/ui/sheetbutton";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { PlusIcon } from "lucide-react";
import { useGetServiceInstanceQuery } from "../api/graphql";
import GroupCard from "../components/cards/GroupCard";
import UserCard from "../components/cards/UserCard";
import InstanceCompositionGraph from "../components/graphs/InstanceCompositionGraph";

import { Image } from "@/components/ui/image";
import { useResolve } from "@/datalayer/hooks/useResolve";

export type IRepresentationScreenProps = {};

const Page = asDetailQueryRoute(useGetServiceInstanceQuery, ({ data }) => {
  const resolve = useResolve();
  return (
    <PageLayout
      title="Lok"
      pageActions={
        <>
          <SheetButton
            alwaysShow
            name="updateserviceinstance"
            variant={"outline"}
            size={"sm"}
            dialogProps={{ instance: data.serviceInstance }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Update Service
          </SheetButton>
        </>
      }
    >
      <div className="grid grid-cols-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <div className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl flex flex-col">
              {data.serviceInstance.release.service.identifier}
              <div className="text-lg text-muted-foreground">
                {data.serviceInstance.release.service.identifier}
              </div>
              <div className="text-lg text-foreground font-light">
                Provides {data.serviceInstance.release.service.identifier}
              </div>
              <div className="text-lg text-foreground font-light">
                {data.serviceInstance.release.service.description}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <div className="p-1">
            <Card>
              <CardContent className="flex aspect-[3/2] items-center justify-center p-6 max-h-[200px]">
                {data.serviceInstance.logo && (
                  <Image
                    src={resolve(data?.serviceInstance?.logo.presignedUrl)}
                    className="my-auto"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ListRender
        array={data?.serviceInstance?.allowedUsers}
        title="Allowed Users"
      >
        {(item, index) => {
          return <UserCard item={item} key={index} />;
        }}
      </ListRender>

      <ListRender
        array={data?.serviceInstance?.deniedUsers}
        title="Denied Users"
      >
        {(item, index) => {
          return <UserCard item={item} key={index} />;
        }}
      </ListRender>

      <ListRender
        array={data?.serviceInstance?.allowedGroups}
        title="Allowed Groups"
      >
        {(item, index) => {
          return <GroupCard item={item} key={index} />;
        }}
      </ListRender>

      <ListRender
        array={data?.serviceInstance?.deniedGroups}
        title="Denied Groups"
      >
        {(item, index) => {
          return <GroupCard item={item} key={index} />;
        }}
      </ListRender>

      <InstanceCompositionGraph service={data.serviceInstance} />

      <Separator />
    </PageLayout>
  );
});

export default Page;
