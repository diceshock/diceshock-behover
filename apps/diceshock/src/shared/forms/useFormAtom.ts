import { useAtomValue, useSetAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import type { FormAtomBundle } from "./createFormAtom";

/**
 * Hook wrapping a FormAtomBundle — provides form state, updater, validation, and lifecycle.
 *
 * Usage:
 *   const { form, setForm, isDirty, isValid, errors, reset, hydrate } = useFormAtom(myFormAtoms);
 *   // setForm(draft => { draft.name = "new" });
 */
export function useFormAtom<B extends FormAtomBundle>(bundle: B) {
  const [form, setForm] = useImmerAtom(bundle.formAtom);
  const isDirty = useAtomValue(bundle.isDirtyAtom);
  const isValid = useAtomValue(bundle.isValidAtom);
  const errors = useAtomValue(bundle.errorsAtom);
  const reset = useSetAtom(bundle.resetAtom);
  const hydrate = useSetAtom(bundle.hydrateAtom);

  return { form, setForm, isDirty, isValid, errors, reset, hydrate } as const;
}
