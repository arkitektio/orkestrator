import { MikroAnnotation } from "@/core/linkers";
import React from "react";

import { useAnnotationFilterBar } from "../components/filter/AnnotationFilterBar";
import AnnotationList from "../components/lists/AnnotationList";
import { MIKRO_HELP } from "../help";

export type IAnnotationsScreenProps = {};

const Page: React.FC<IAnnotationsScreenProps> = () => {
  const { filters, ordering, actions } = useAnnotationFilterBar();

  return (
    <MikroAnnotation.ListPage title="Annotations" pageActions={actions} help={MIKRO_HELP.annotations}>
      <div className="p-3 flex flex-col gap-3">
        <AnnotationList filters={filters} ordering={ordering} />
      </div>
    </MikroAnnotation.ListPage>
  );
};

export default Page;
