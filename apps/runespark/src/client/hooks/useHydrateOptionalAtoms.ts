import type { WritableAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";

export default function useHydrateOptionalAtom<T>(
  // biome-ignore lint/suspicious/noExplicitAny: WritableAtom generic parameters for args and result
  atom: WritableAtom<T, any, any>,
  value: T | undefined | null,
  isValid?: boolean,
) {
  // biome-ignore lint/suspicious/noExplicitAny: WritableAtom generic parameters for args and result
  const hydrateArr: [WritableAtom<T, any, any>, T][] = [];

  if ((value !== undefined && value !== null) || isValid === true)
    hydrateArr.push([atom, value as T]);

  useHydrateAtoms(hydrateArr);
}
