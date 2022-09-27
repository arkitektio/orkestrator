import React, { useState, useEffect } from "react";
import { MyRepresentations } from "../../../components/MyRepresentations";
import { PageLayout } from "../../../layout/PageLayout";

export interface DataRepresentationsProps {}

export const DataRepresentations: React.FC<DataRepresentationsProps> = (
  props
) => {
  return (
    <PageLayout>
      <MyRepresentations />
    </PageLayout>
  );
};
