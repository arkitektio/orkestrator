"use client";

import { ColumnDef } from "@tanstack/react-table";

import {
  ColumnFragment,
  ColumnKind,
  GraphFragment,
  GraphTableRenderFragment,
  ValueKind,
} from "@/kraph/api/graphql";
import { KraphEntity } from "@/linkers";
import Timestamp from "@/components/ui/timestamp";
import { CypherSchema } from "../cypher/CypherField";

const columnToDef = (
  column: ColumnFragment,
  render: GraphTableRenderFragment,
): ColumnDef<{ [key: string]: unknown }> => {
  if (column.kind == ColumnKind.Node) {
    return {
      id: column.key,
      accessorKey: column.key,
      header: () => (
        <div className="text-center">{column.label}</div>
      ),
      cell: ({ row }) => {
        const label = row.getValue(column.key) as string;

        const concat_id = render.query.graph.ageName + ":" + label;

        return (
          <KraphEntity.Smart object={{ id: concat_id }}>
            <KraphEntity.DetailLink object={{ id: concat_id }}>
              {label || ""}
              {concat_id}
            </KraphEntity.DetailLink>
          </KraphEntity.Smart>
        );
      },
      enableSorting: true,
      enableGlobalFilter: true,
    };
  }

  if (column.kind == ColumnKind.Edge) {
    return {
      id: column.key,
      accessorKey: column.key,
      header: () => (
        <div className="text-center">{column.label || column.key}</div>
      ),
      cell: ({ row }) => {
        const label = row.getValue(column.key) as string;

        return <div className="text-center font-medium">{label || ""}</div>;
      },
      enableSorting: true,
      enableGlobalFilter: true,
    };
  }

  if (column.kind == ColumnKind.Value) {
    if (column.valueKind == ValueKind.Datetime) {
      return {
        id: column.key,
        accessorKey: column.key,
        header: () => (
          <div className="text-center">{column.label || column.key}</div>
        ),
        cell: ({ row }) => {
          const label = row.getValue(column.key) as string;

          if (!label) {
            return <div className="text-center font-medium">No Date</div>;
          }

          return (
            <div className="text-center font-medium">
              <Timestamp date={new Date(parseInt(label))} relative />
            </div>
          );
        },
        enableSorting: true,
        enableGlobalFilter: true,
      };
    }

    return {
      id: column.key,
      accessorKey: column.key,
      header: () => (
        <div className="text-center">{column.label || column.key}</div>
      ),
      cell: ({ row }) => {
        const label = row.getValue(column.key) as string;

        return <div className="text-center font-medium">{label || ""}</div>;
      },
      enableSorting: true,
      enableGlobalFilter: true,
    };
  }

  throw new Error(`Unknown column kind: ${column.kind}`);
};

export const parseValue = (
  value: string,
  valueKind: ValueKind | null | undefined,
) => {
  if (valueKind == ValueKind.Int) {
    return parseInt(value);
  }

  if (valueKind == ValueKind.Float) {
    return parseFloat(value);
  }

  return value;
};

export const calculateColumns = (
  render: GraphTableRenderFragment | undefined | null,
): ColumnDef<{ [key: string]: unknown }>[] => {
  if (!render || !render.query) {
    return [];
  }

  return render.query.columns.map((c) => {
    return columnToDef(c, render);

  });
};

export const calculateRows = (render: GraphTableRenderFragment | undefined | null) => {
  if (!render || !render.query) {
    return [];
  }

  const rowObjects = render.rows.map((row) =>
    render.query.columns.reduce(
      (acc, column, index) => {
        acc[column.key] = parseValue(row[index], column.valueKind);
        return acc;
      },
      {} as Record<string, unknown>,
    ),
  );
  return rowObjects;
};

export const baseProperties = {
  sequence: { description: "A sequence number" },
  created_at: { description: "Creation timestamp" },
  category_id: { description: "ID linking to the category group" },
  type: { description: "The type of the entity" },
  category_type: { description: "The category type" },
};

export const buildCypherSchemaFromGraph = (
  graph: GraphFragment,
): CypherSchema => {
  const schema: CypherSchema = { nodes: {}, relationships: {} };

  // Build the schema from the graph data
  graph.entityCategories.forEach((node) => {
    schema.nodes[node.ageName] = {
      type: node.__typename || "Unknown",
      label: node.label,
      description: node.description || "No Description",
      properties: {
        ...baseProperties,
        tags: { description: "Tags associated with the entity" },
        pinned_by: { description: "Users who pinned this entity" },
      },
    };
  });




  graph.naturalEventCategories.forEach((node) => {
    schema.nodes[node.ageName] = {
      type: node.__typename || "Unknown",
      label: node.label,
      description: node.description || "No Description",
      properties: {
        created_at: { description: "Creation timestamp" },
        category_id: { description: "ID linking to the category group" },
      },
    };
  });


  graph.protocolEventCategories.forEach((node) => {
    schema.nodes[node.ageName] = {
      type: node.__typename || "Unknown",
      label: node.label,
      description: node.description || "No Description",
      properties: {
        ...baseProperties,
        valid_from: { description: "When the event is valid from" },
        valid_to: { description: "When the event is valid to" },
        performed_by: { description: "Who performed the event" },
      },
    };

    for (const variable of node.inputs) {
      schema.relationships[variable.role] = {
        type: "Role",
        label: "Role",
        description: "A description edge",
        properties: {
          quantity: { description: "A description" },
          role: { description: "The role played by the entity" },
        },
      };
    }
  });

  graph.relationCategories.forEach((relation) => {
    schema.relationships[relation.ageName] = {
      type: relation.__typename || "Unknown",
      label: relation.label,
      description: relation.description || "No Description",
      properties: {
        created_at: { description: "Creation timestamp" },
        category_id: { description: "ID linking to the category group" },
      },
    };
  });

  graph.structureRelationCategories.forEach((relation) => {
    schema.relationships[relation.ageName] = {
      type: relation.__typename || "Unknown",
      label: relation.label,
      description: relation.description || "No Description",
      properties: {
        created_at: { description: "Creation timestamp" },
        category_id: { description: "ID linking to the category group" },
      },
    };
  });

  graph.measurementCategories.forEach((relation) => {
    schema.relationships[relation.ageName] = {
      type: relation.__typename || "Unknown",
      label: relation.label,
      description: relation.description || "No Description",
      properties: {
        created_at: { description: "Creation timestamp" },
        category_id: { description: "ID linking to the category group" },
      },
    };
  });

  schema.relationships["DESCRIBES"] = {
    type: "Unknown",
    label: "Describes",
    description: "A description edge",
    properties: {
      hallo: { description: "A description" },
    },
  };

  return schema;
};
