import { Card } from "@/components/ui/card";
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
import { Workflow } from "lucide-react";

export const WorkspaceCarousel = () => {
  const { data } = useWorkspaceCarouselQuery({
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

  const workspaces = data?.workspaces ?? [];
  if (workspaces.length === 0) return null;

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {workspaces.map((item, index) => (
          <CarouselItem key={item.id}>
            <FlussWorkspace.DetailLink object={item} className="group block">
              <Card className="flex h-64 flex-col gap-0 overflow-hidden p-0 transition-colors group-hover:border-primary/40 md:flex-row">
                <div className="flex min-w-0 shrink-0 flex-col justify-center gap-1 p-6 md:w-80">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/60">
                    {index === 0 ? "Latest workspace" : "Recent workspace"}
                  </p>
                  <h2 className="truncate text-2xl font-semibold tracking-tight transition-colors group-hover:text-primary">
                    {item.title}
                  </h2>
                  {item.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                  {item.latestFlow?.title && (
                    <p className="mt-2 flex items-center gap-2 truncate text-xs text-muted-foreground/60">
                      <Workflow className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.latestFlow.title}</span>
                    </p>
                  )}
                </div>
                {item.latestFlow && (
                  <div className="min-h-0 min-w-0 flex-1 border-t bg-muted/20 md:border-l md:border-t-0">
                    <ShowFlow flow={item.latestFlow} preview />
                  </div>
                )}
              </Card>
            </FlussWorkspace.DetailLink>
          </CarouselItem>
        ))}
      </CarouselContent>
      {workspaces.length > 1 && (
        <>
          <CarouselPrevious className="left-auto right-14 top-auto bottom-4 z-10 translate-y-0" />
          <CarouselNext className="right-4 top-auto bottom-4 z-10 translate-y-0" />
        </>
      )}
    </Carousel>
  );
};

export default WorkspaceCarousel;
