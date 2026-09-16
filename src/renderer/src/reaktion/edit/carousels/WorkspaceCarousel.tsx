import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { FlussWorkspace } from "@/linkers";
import { Ordering, useWorkspaceCarouselQuery } from "@/reaktion/api/graphql";
import { ShowFlow } from "@/reaktion/show/ShowFlow";

export const WorkspaceCarousel = () => {
  const { data, error } = useWorkspaceCarouselQuery({
    variables: {
      pagination: {
        limit: 3,
      },
      ordering: [
        {
          createdAt: Ordering.Desc,
        },
      ],
    },
  });

  return (
    <div className="w-full">
      {error && <div>Error: {error.message}</div>}
      <Carousel className="w-full dark:text-white">
        <CarouselPrevious />
        <CarouselContent>
          {data?.workspaces.map((item, index) => (
            <CarouselItem key={index} className="grid grid-cols-8">
              <div className="col-span-2 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
                <div>
                  <p className="mt-3 text-xl text-muted-foreground">
                    Latest Workspace
                  </p>
                  <FlussWorkspace.DetailLink object={item}>
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                      {item.title}
                    </h1>
                    <p className="mt-3 text-xl text-muted-foreground">
                      {item.description}
                    </p>
                  </FlussWorkspace.DetailLink>
                </div>
              </div>
              <div className="col-span-6">
                <FlussWorkspace.DetailLink object={item} className="p-1">
                  <Card>
                    <CardContent className="flex aspect-[10/5] p-6 ">
                      <div className="w-full h-full">
                        {item.latestFlow && <ShowFlow flow={item.latestFlow} />}
                      </div>
                    </CardContent>
                  </Card>
                </FlussWorkspace.DetailLink>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNext />
      </Carousel>
    </div>
  );
};


export default WorkspaceCarousel;
