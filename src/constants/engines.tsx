export type NodeEngine = {
  engine: string;
  description: string;
  allowed_nodes: [string];
};

export type NodeEngineMap = { [key: string]: NodeEngine };

export const nodeEngines: NodeEngineMap = {
  rx: {
    engine: "rx",
    description:
      "This Type of Programming allows for flow oriented Graph constructing, imaging your Data as a Stream",
    allowed_nodes: ["*"],
  },
  dask: {
    engine: "dask",
    description:
      "This Type of Programming allows for sequentially executing your calls and organize them in a Dask Graph",
    allowed_nodes: ["dask"],
  },
  auto: {
    engine: "auto",
    description:
      "We will try to infer the best sort of programming for your Graph, (implementation reqults to Rx Right now)",
    allowed_nodes: ["*"],
  },
};
