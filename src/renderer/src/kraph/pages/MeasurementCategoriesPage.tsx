import { Card } from "@/core/ui/card";
import { KraphMeasurementCategory } from "@/core/linkers";
import React from "react";
import MeasurementCategoryList from "../components/lists/MeasurementCategoryList";
import { KRAPH_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <KraphMeasurementCategory.ListPage
      help={KRAPH_HELP.measurementCategories}
      title="Measurement Categories"
    >
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-4">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your measurement categories
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Measurements represent timed relationsships between your
              measurements and the structures that actually measured the metric.
              <br />
              <strong>
                Explore the various categories to enhance your analysis.
              </strong>
              <br />
            </p>
          </div>
          <Card className="w-full h-full flex-row relative"></Card>
        </div>

        <MeasurementCategoryList pagination={{ limit: 30 }} />
      </div>
    </KraphMeasurementCategory.ListPage>
  );
};

export default Page;
