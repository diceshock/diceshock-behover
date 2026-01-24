import type { Session } from "@auth/core/types";
import { signOut as signOutAuthJs, useSession } from "@hono/auth-js/react";
import { produce } from "immer";
import { atom, useAtom, type WritableAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { useCallback, useMemo } from "react";
import type { UserInfo } from "@/server/middlewares/auth";
import type { Recipe } from "@/shared/types/kits";
import useCrossData from "./useCrossData";

const userInfoAtom = atom<UserInfo | null>(null);

export function useAuthRegister() {
  const { UserInfo } = useCrossData() ?? {};

  const atoms: [WritableAtom<any, any, any>, any][] = [];

  if (UserInfo) atoms.push([userInfoAtom, UserInfo]);

  useHydrateAtoms(atoms);
}

export default function useAuth() {
  const { data: session, status } = useSession() ?? {};
  const [userInfo, setUserInfo] = useAtom(userInfoAtom);

  const setUserInfoIm = useCallback(
    (recipe: Recipe<UserInfo>) => setUserInfo(produce(userInfo, recipe)),
    [userInfo, setUserInfo],
  );

  const signOut = useCallback(async () => {
    await signOutAuthJs({ redirect: false });
    window.location.href = "/";
  }, []);

  return useMemo(
    () => ({
      session: session as Session | null,
      status,
      userInfo,
      setUserInfoIm,
      signOut,
    }),
    [session, status, userInfo, setUserInfoIm, signOut],
  );
}
