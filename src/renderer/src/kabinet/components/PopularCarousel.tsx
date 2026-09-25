import { Card, CardContent } from "@/core/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/core/ui/carousel";
import { ActionDescription } from "@/core/ports/engine/ActionDescription";
import { ListDefinitionFragment, useListDefinitionsQuery } from "../api/graphql";
import { logoFor, releaseIdentity } from "../appIdentity";
import { AppIcon } from "./AppIcon";

export const Test = () => {
  return <div>Hallo</div>;
};

/** A flavour's own logo wins; otherwise the app's release logo or its mark. */
const appOf = (flavour: ListDefinitionFragment["flavours"][number] | undefined) =>
  flavour
    ? { ...releaseIdentity(flavour.release), logo: logoFor(flavour) ?? undefined }
    : null;

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
                      {/* The app this action comes from, rather than the slide
                          number the placeholder used to show. A definition with
                          no flavour has no app to show. */}
                      {appOf(item.flavours[0]) && (
                        <AppIcon
                          app={appOf(item.flavours[0])!}
                          size={96}
                          className="size-24"
                        />
                      )}
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
