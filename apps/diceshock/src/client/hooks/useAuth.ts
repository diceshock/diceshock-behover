import { atom, type WritableAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import type { UserInfo } from "@/shared/types";
import useCrossData from "./useCrossData";

const userInfoAtom = atom<UserInfo | null>(null);

export function useAuthRegister() {
  const { UserInfo } = useCrossData() ?? {};

  const atoms: [WritableAtom<any, any, any>, any][] = [];

  if (UserInfo) atoms.push([userInfoAtom, UserInfo]);

  useHydrateAtoms(atoms);
}

export default function useAuth() {}
