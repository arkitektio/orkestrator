import { useFluss } from "./fluss-context";

export function withFluss<T extends (options: any) => any>(func: T): T {
  const Wrapped = (nana: any) => {
    const { client } = useFluss();
    return func({ ...nana, client: client });
  };
  return Wrapped as T;
}
