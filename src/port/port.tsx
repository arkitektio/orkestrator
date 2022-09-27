import { usePort } from "./port-context";

export function withPort<T extends (options: any) => any>(func: T): T {
  const Wrapped = (nana: any) => {
    const { client } = usePort();
    return func({ ...nana, client: client });
  };
  return Wrapped as T;
}
