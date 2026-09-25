import { Explainer } from "@/components/explainer/Explainer";
import { MikroAnnotation } from "@/linkers";
import React from "react";

import { useAnnotationFilterBar } from "../components/filter/AnnotationFilterBar";
import AnnotationList from "../components/lists/AnnotationList";

export type IAnnotationsScreenProps = {};

const Page: React.FC<IAnnotationsScreenProps> = () => {
  const { filters, ordering, actions } = useAnnotationFilterBar();

  return (
    <MikroAnnotation.ListPage title="Annotations" pageActions={actions}>
      <div className="p-3 flex flex-col gap-3">
        <Explainer
          title="Annotations"
          description="Human-drawn shapes. An annotation belongs to its collection, not to a scene: the collection owns the coordinate system its vectors are expressed in, and one collection is drawn by one annotation layer per scene. Delete the scene and the annotation survives."
        />
        <AnnotationList filters={filters} ordering={ordering} />
      </div>
    </MikroAnnotation.ListPage>
  );
};

export default Page;
