import type { Draft } from "immer";
import z4 from "zod/v4";

export type Recipe<T> = (draft: Draft<T>) => Draft<T> | void;
export type PartialDeep<T> = T extends object
  ? { [P in keyof T]+?: PartialDeep<T[P]> }
  : T;
export type NodeTimeout = NodeJS.Timeout;
