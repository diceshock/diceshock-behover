import type { Session } from "@auth/core/types";
import { signOut as signOutAuthJs, useSession } from "@hono/auth-js/react";
import { produce } from "immer";
import { atom, useAtom, type WritableAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { useCallback, useMemo } from "react";
import type { UserInfo } from "@/server/middlewares/auth";
import type { Recipe } from "@/shared/types/kits";
import trpcClientPublic from "@/shared/utils/trpc";
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
    try {
      const tableCode = window.location.pathname.match(/^\/t\/(.+)/)?.[1];
      if (tableCode) {
        const data = await trpcClientPublic.tables.getByCode.query({
          code: tableCode,
        });
        if (data?.occupancies && session?.user?.id) {
          const myOcc = data.occupancies.find(
            (o) => o.user_id === session.user!.id,
          );
          if (myOcc) {
            await trpcClientPublic.tables.pause.mutate({
              occupancyId: myOcc.id,
              code: tableCode,
            });
          }
        }
      }
    } catch {}

    await signOutAuthJs({ redirect: false });
    window.location.href = "/";
  }, [session]);

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
