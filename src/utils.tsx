import { E } from "@tauri-apps/api/os-1507a225";
import { EnumDeclaration, EnumType } from "typescript";

export function enum_to_options<T extends object>(
  e: T
): { label: string; value: string }[] {
  return Object.keys(e).map((key: any) => ({
    label: e[key],
    value: key,
  }));
}
