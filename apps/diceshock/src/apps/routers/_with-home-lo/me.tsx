import {
  CopyIcon,
  PencilSimpleLineIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useState } from "react";
import Modal from "@/client/components/modal";
import useAuth from "@/client/hooks/useAuth";
import { useMessages } from "@/client/hooks/useMessages";
import { copyToClipboard } from "@/server/utils";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute("/_with-home-lo/me")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userInfo, setUserInfoIm } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(userInfo?.nickname ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const messages = useMessages();

  const handleEditClick = useCallback(() => {
    setNickname(userInfo?.nickname ?? "");
    setIsEditing(true);
  }, [userInfo?.nickname]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setNickname(userInfo?.nickname ?? "");
  }, [userInfo?.nickname]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!nickname.trim()) {
        messages.error("昵称不能为空");
        return;
      }

      if (nickname.trim() === userInfo?.nickname) {
        setIsEditing(false);
        return;
      }

      setIsLoading(true);

      try {
        const result = await trpcClientPublic.auth.updateUserInfo.mutate({
          nickname: nickname.trim(),
        });

        if (result.success) {
          if ("data" in result && result.data) {
            const updatedNickname = result.data.nickname;
            setUserInfoIm((draft) => {
              if (!draft) return undefined;
              draft.nickname = updatedNickname;
              return draft;
            });
            messages.success("昵称修改成功");
            setIsEditing(false);
          } else {
            messages.error("修改失败，请稍后重试");
          }
        } else {
          const errorMessage =
            "message" in result ? result.message : "修改失败，请稍后重试";
          messages.error(errorMessage);
        }
      } catch (error) {
        console.error("更新用户信息失败:", error);
        messages.error("网络错误，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    },
    [nickname, userInfo?.nickname, setUserInfoIm, messages],
  );

  const handleCopyUid = useCallback(async () => {
    if (!userInfo?.uid) return;

    const success = await copyToClipboard(userInfo.uid);
    if (success) {
      messages.success("复制成功");
    } else {
      messages.error("复制失败，请稍后重试");
    }
  }, [userInfo?.uid, messages]);

  return (
    <>
      <main className="min-h-screen w-full flex-col items-center mt-40">
        <div className="mx-auto w-fit">
          <h1 className="text-5xl text-center align-baseline">
            {userInfo?.nickname ?? "Anonymous Shock"}
            <button
              className="btn btn-ghost btn-circle mt-1.5"
              onClick={handleEditClick}
            >
              <PencilSimpleLineIcon size={24} />
            </button>
          </h1>
          <h2 className="text-sm text-center text-base-content/50 flex items-center gap-1">
            {userInfo?.uid}
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={handleCopyUid}
            >
              <CopyIcon size={16} />
            </button>
          </h2>
        </div>
      </main>

      <Modal
        isCloseOnClick
        isOpen={isEditing}
        onToggle={(evt) => {
          if (!evt.open) handleClose();
        }}
      >
        <div
          className={clsx(
            "modal-box max-w-none md:max-w-120 min-h-64 max-h-[80vh] rounded-xl px-0 pb-4 flex flex-col",
            "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-visible",
            "border border-base-content/30",
          )}
        >
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle absolute top-4 right-4"
            disabled={isLoading}
          >
            <XIcon className="size-4" weight="bold" />
          </button>

          <h3 className="text-base font-bold px-7 pb-4 flex items-center gap-1">
            修改昵称
          </h3>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 py-4 px-12"
          >
            <label className="flex flex-row gap-2">
              <span className="label text-sm min-w-20">昵称:</span>
              <input
                type="text"
                placeholder="请输入新昵称"
                className="input input-sm flex-1"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleClose}
                disabled={isLoading}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isLoading || !nickname.trim()}
              >
                {isLoading ? "保存中..." : "确认"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
