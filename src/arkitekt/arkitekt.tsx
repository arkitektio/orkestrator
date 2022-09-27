import { useQuery } from "@apollo/client";
import { useArkitekt } from "./arkitekt-context";

export const useArkitektQuery = (query: any) => {
  const { client } = useArkitekt();
  return useQuery(query, { client: client });
};

export function withArkitekt<T extends (options: any) => any>(func: T): T {
  const Wrapped = (nana: any) => {
    const { client } = useArkitekt();
    return func({ ...nana, client: client });
  };
  return Wrapped as T;
}
