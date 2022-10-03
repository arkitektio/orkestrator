import React, { useState, useEffect } from "react";
import { createGraphiQLFetcher, Fetcher } from "@graphiql/toolkit";
import { useMikro } from "../../mikro-types";
import { useHerre } from "herre";
import { GraphiQLProvider } from "graphiql";
import { IQL } from "./IQL";
import { DocumentNode } from "@apollo/client";

export interface MikroIQLProps {
  query: string;
  onEditQuery?: (value: string, documentAst: DocumentNode | undefined) => void;
}

export const MikroIQL: React.FC<MikroIQLProps> = ({ query, onEditQuery }) => {
  const { config } = useMikro();
  const { token } = useHerre();

  const [sfetcher, setFetcher] = useState<Fetcher | undefined>();

  const fetcher = createGraphiQLFetcher({
    url: config?.endpoint_url || "",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return (
    <>
      <GraphiQLProvider fetcher={fetcher} query={query}>
        <IQL onEditQuery={onEditQuery} />
      </GraphiQLProvider>
    </>
  );
};
