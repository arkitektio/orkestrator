export type CypherNodeSchema = {
  label: string;
  description: string;
  type: string;
  properties: {
    [field: string]: {
      description: string;
    };
  };
};

export type CypherRelationshipSchema = {
  [type: string]: {
    label: string;
    description: string;
    type: string;
    properties: {
      [field: string]: {
        description: string;
      };
    };
  };
};

export type CypherSchema = {
  nodes: Record<string, CypherNodeSchema>;
  relationships: CypherRelationshipSchema;
};
