import { Card } from "@/core/ui/card";
import { KraphStructureKind } from "@/core/linkers";
import React from "react";
import StructureKindList from "../components/lists/StructureKindList";
import { KRAPH_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <KraphStructureKind.ListPage
      help={KRAPH_HELP.structureKinds}
      title="Structure Categories"
    >
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-4">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your Structure categories
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Oh Structures! Structures represent the data that carries measurments and links to the underlining
              biological entity. They are the main focus of your analysis and carry metrics.
            </p>

          </div>
          <Card className="w-full h-full flex-row relative"></Card>
        </div>

        <StructureKindList pagination={{ limit: 30 }} />
      </div>
    </KraphStructureKind.ListPage>
  );
};

export default Page;
