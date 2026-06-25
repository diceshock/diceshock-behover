import { useApolloClient } from "@apollo/client";
import type { Session } from "@auth/core/types";
import { signOut as signOutAuthJs, useSession } from "@hono/auth-js/react";
import { produce } from "immer";
import { atom, useAtom, type WritableAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { useCallback, useMemo } from "react";
import {
  PauseMyOrderDocument,
  type PauseMyOrderMutation,
  type PauseMyOrderMutationVariables,
  TableByCodeDocument,
  type TableByCodeQuery,
  type TableByCodeQueryVariables,
} from "@/client/graphql/__generated__";
import type { UserInfo } from "@/server/middlewares/auth";
import type { Recipe } from "@/shared/types/kits";
import useCrossData from "./useCrossData";

const userInfoAtom = atom<UserInfo | null>(null);

export function useAuthRegister() {
  const { UserInfo } = useCrossData() ?? {};

  const atoms = new Map<typeof userInfoAtom, UserInfo>();

  if (UserInfo) atoms.set(userInfoAtom, UserInfo);

  useHydrateAtoms(atoms);
}

export default function useAuth() {
  const client = useApolloClient();
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
        const { data } = await client.query<
          TableByCodeQuery,
          TableByCodeQueryVariables
        >({
          query: TableByCodeDocument,
          variables: { code: tableCode },
        });
        if (data?.tableByCode?.occupancies && session?.user?.id) {
          const myOcc = data.tableByCode.occupancies.find(
            (o) => o.userId === session.user!.id,
          );
          if (myOcc) {
            await client.mutate<
              PauseMyOrderMutation,
              PauseMyOrderMutationVariables
            >({
              mutation: PauseMyOrderDocument,
              variables: {
                input: {
                  occupancyId: myOcc.id,
                  code: tableCode,
                },
              },
            });
          }
        }
      }
    } catch {}

    await signOutAuthJs({ redirectTo: "/" });
  }, [session, client]);

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
