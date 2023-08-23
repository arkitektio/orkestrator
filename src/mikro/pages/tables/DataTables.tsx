import React, { useState, useEffect } from "react";
import { MyTables } from "../../../components/MyTables";
import { PageLayout } from "../../../layout/PageLayout";

export interface DataTablesProps {}

export const DataTables: React.FC<DataTablesProps> = (props) => {
  return (
    <PageLayout>
      <MyTables limit={20} />
    </PageLayout>
  );
};
