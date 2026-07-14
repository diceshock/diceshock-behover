import { atom } from "jotai";
import { atomWithImmer } from "jotai-immer";
import type { z } from "zod/v4";

/**
 * Creates a form atom bundle: immer-powered state + derived validation/dirty atoms.
 *
 * Usage:
 *   const myForm = createFormAtom(mySchema, { name: "", age: 0 });
 *   // In component: const { form, setForm, ... } = useFormAtom(myForm);
 */
export function createFormAtom<S extends z.ZodType>(
  schema: S,
  initial: z.infer<S>,
) {
  type T = z.infer<S>;

  const formAtom = atomWithImmer<T>(initial);
  const initialAtom = atom<T>(initial);

  const isDirtyAtom = atom((get) => {
    const current = get(formAtom);
    const init = get(initialAtom);
    return JSON.stringify(current) !== JSON.stringify(init);
  });

  const validationAtom = atom((get) => schema.safeParse(get(formAtom)));

  const isValidAtom = atom((get) => get(validationAtom).success);

  const errorsAtom = atom((get) => {
    const result = get(validationAtom);
    return result.success ? null : result.error;
  });

  const resetAtom = atom(null, (get, set) => {
    set(formAtom, get(initialAtom));
  });

  /** Hydrate form with server data — also updates the "initial" snapshot for dirty detection. */
  const hydrateAtom = atom(null, (_get, set, values: T) => {
    set(formAtom, values);
    set(initialAtom, values);
  });

  return {
    formAtom,
    isDirtyAtom,
    isValidAtom,
    errorsAtom,
    resetAtom,
    hydrateAtom,
    schema,
    initial,
  } as const;
}

export type FormAtomBundle<S extends z.ZodType = z.ZodType> = ReturnType<
  typeof createFormAtom<S>
>;
