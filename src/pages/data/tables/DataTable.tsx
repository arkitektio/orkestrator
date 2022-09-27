import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Table } from "../../../mikro/components/Table";

export interface DataTableProps {}

export const DataTable: React.FC<DataTableProps> = (props) => {
  const { table } = useParams<{ table: string }>();

  if (!table) return <></>;

  return <Table id={table} />;
};
