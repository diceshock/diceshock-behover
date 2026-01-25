import { type Draft, produce } from "immer";
import { useCallback, useMemo, useState } from "react";

type Recipe<T> = (draft: Draft<T>) => Draft<T> | void;

export default function useImmer<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);

  const set = useCallback(
    (recipe: Recipe<T>) => setState(produce(state, recipe)),
    [state],
  );

  return useMemo(() => [state, set] as const, [state, set]);
}
