import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { FlussRun } from "@/linkers";
import { useRunCarouselQuery } from "@/reaktion/api/graphql";
import { TrackFlow } from "@/reaktion/track/TrackFlow";

export const RunCarousel = ({ }) => {
  const { data, error } = useRunCarouselQuery({
    variables: {
      pagination: {
        limit: 3,
      },
    },
  });

  return (
    <div className="w-full">
      {error && <div>Error: {error.message}</div>}
      <Carousel className="w-full text-foreground">
        <CarouselPrevious />
        <CarouselContent>
          {data?.runs.map((item, index) => (
            <CarouselItem key={index} className="grid grid-cols-8">
              <div className="col-span-2 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
                <div>
                  <p className="mt-3 text-xl text-muted-foreground">
                    Latest Run
                  </p>
                  <FlussRun.DetailLink object={item}>
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                      {item.flow.title}
                    </h1>
                    <p className="mt-3 text-xl text-muted-foreground">
                      {item.createdAt}
                    </p>
                  </FlussRun.DetailLink>
                </div>
              </div>
              <div className="col-span-6">
                <div className="p-1">
                  <Card>
                    <CardContent className="flex aspect-[10/5] p-6 ">
                      <div className="w-full h-full">
                        {item && <TrackFlow run={item} />}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNext />
      </Carousel>
    </div>
  );
};


export default RunCarousel;
