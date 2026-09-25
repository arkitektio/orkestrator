import { Card } from "@/core/ui/card";
import { KraphTerm } from "@/core/linkers";
import React from "react";
import TermList from "../components/lists/TermList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <KraphTerm.ListPage title="Terms">
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-4">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your vocabulary
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              A term is a word your organization uses. Graphs declare the words
              they speak, and every graph declaring the same word sees the same
              claims — so a graph is a view onto the vocabulary, not a silo.
            </p>
          </div>
          <Card className="w-full h-full flex-row relative"></Card>
        </div>

        <TermList pagination={{ limit: 30 }} />
      </div>
    </KraphTerm.ListPage>
  );
};

export default Page;
