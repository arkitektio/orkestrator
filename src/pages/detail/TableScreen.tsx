import React from "react";
import { useParams } from "react-router";
import { Table } from "../../mikro/components/Table";

export type ITableScreenProps = {};

const TableScreen: React.FC<ITableScreenProps> = () => {
  const { table } = useParams<{ table: string }>();

  if (!table) return <></>;

  return (
    <div>
      <Table id={table} />
    </div>
  );
};

export { TableScreen };
