import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ActionDescription } from "@/lib/rekuest/ActionDescription";
import { useListDefinitionsQuery } from "../api/graphql";

export const Test = () => {
  return <div>Hallo</div>;
};

export const PopularCarousel = ({ }) => {
  const { data } = useListDefinitionsQuery({
    variables: {},
  });

  return (
    <div className="w-full">
      <Carousel className="w-full dark:text-foreground">
        <CarouselPrevious />
        <CarouselContent>
          {data?.definitions.map((item, index) => (
            <CarouselItem key={index} className="grid grid-cols-6">
              <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
                <div>
                  <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                    {item.name}
                  </h1>
                  <p className="mt-3 text-xl text-muted-foreground">
                    {item.description && (
                      <ActionDescription description={item.description} />
                    )}
                  </p>
                  {item.flavours.map((flavour) => (
                    <span key={flavour.id} className="text-sm">
                      @{flavour.release.app.identifier}/
                      {flavour.release.version}:{flavour.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <div className="p-1">
                  <Card>
                    <CardContent className="flex aspect-[3/2] items-center justify-center p-6">
                      <span className="text-4xl font-semibold">
                        {index + 1}
                      </span>
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
