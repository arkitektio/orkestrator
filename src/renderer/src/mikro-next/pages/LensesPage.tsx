import { Explainer } from "@/components/explainer/Explainer";
import { MikroLens } from "@/linkers";
import React from "react";
import LensList from "../components/lists/LensList";

const LensesPage: React.FC = () => {
  return (
    <MikroLens.ListPage pageActions={<></>} title="Lenses">
      <div className="p-3">
        <Explainer
          title="Lenses"
          description="A lens is a selection over an array dataset: the whole array, or a crop of some of its axes. Every image layer in a scene renders through one, and a crop lens has its own coordinate system for derived data to land in."
        />
        <LensList pagination={{ limit: 30 }} />
      </div>
    </MikroLens.ListPage>
  );
};

export default LensesPage;
