import type { WritableAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";

export default function useHydrateOptionalAtom<T>(
  atom: WritableAtom<T, any, any>,
  value: T | undefined | null,
  isValid?: boolean,
) {
  const hydrateArr: [WritableAtom<T, any, any>, T][] = [];

  if ((value !== undefined && value !== null) || isValid === true)
    hydrateArr.push([atom, value as T]);

  useHydrateAtoms(hydrateArr);
}
