import { useCallback } from "react";
import { apolloClient } from "@/client/graphql/client";

export function useChatMutation() {
  const refreshAfterConfirm = useCallback(async (mutationId: string) => {
    const res = await fetch("/api/chat/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mutationId }),
    });

    if (res.ok) {
      await apolloClient.refetchQueries({ include: "active" });
      return { success: true as const };
    }

    if (res.status === 404)
      return { success: false as const, reason: "expired" as const };
    return { success: false as const, reason: "error" as const };
  }, []);

  return { refreshAfterConfirm };
}
