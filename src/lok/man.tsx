import { useMan } from "./context";

export function withMan<T extends (options: any) => any>(func: T): T {
  const Wrapped = (nana: any) => {
    const { client } = useMan();

    return func({ ...nana, client: client });
  };
  return Wrapped as T;
}
