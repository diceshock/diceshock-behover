import {
  CopyIcon,
  PencilSimpleLineIcon,
  PhoneIcon,
  SignOutIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useState } from "react";
import Modal from "@/client/components/modal";
import useAuth from "@/client/hooks/useAuth";
import { useMessages } from "@/client/hooks/useMessages";
import useSmsCode from "@/client/hooks/useSmsCode";
import { copyToClipboard } from "@/server/utils";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute("/_with-home-lo/me")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userInfo, setUserInfoIm, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(userInfo?.nickname ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const messages = useMessages();

  // 修改手机号相关状态
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);

  const {
    smsForm,
    dispatchSmsForm,
    error: smsError,
    setError: setSmsError,
    countdown,
    getSmsCode,
    reset: resetSms,
  } = useSmsCode({
    phone,
    containerId: "#phone-turnstile-container",
    enabled: isEditingPhone,
  });

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

  const handleEditPhoneClick = useCallback(() => {
    setPhone("");
    setSmsError(null);
    resetSms();
    setIsEditingPhone(true);
  }, [setSmsError, resetSms]);

  const handleClosePhone = useCallback(() => {
    setIsEditingPhone(false);
    setPhone("");
    setSmsError(null);
    resetSms();
  }, [setSmsError, resetSms]);

  const handlePhoneSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!phone.trim()) {
        messages.error("请输入手机号");
        return;
      }

      if (!smsForm.code || smsForm.code.length !== 6) {
        messages.error("请输入6位验证码");
        return;
      }

      setIsLoadingPhone(true);

      try {
        const result = await trpcClientPublic.auth.updateUserInfo.mutate({
          phone: phone.trim(),
          code: smsForm.code,
        });

        if (result.success) {
          if ("data" in result && result.data) {
            const updatedPhone = result.data.phone;
            setUserInfoIm((draft) => {
              if (!draft) return undefined;
              draft.phone = updatedPhone;
              return draft;
            });
            messages.success("手机号修改成功");
            handleClosePhone();
          } else {
            messages.error("修改失败，请稍后重试");
          }
        } else {
          const errorMessage =
            "message" in result ? result.message : "修改失败，请稍后重试";
          messages.error(errorMessage);
        }
      } catch (error) {
        console.error("更新手机号失败:", error);
        messages.error("网络错误，请稍后重试");
      } finally {
        setIsLoadingPhone(false);
      }
    },
    [phone, smsForm.code, setUserInfoIm, messages, handleClosePhone],
  );

  return (
    <>
      <main className="min-h-[calc(100vh-32rem)] w-full flex-col items-center mt-40">
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

        <div className="w-full flex flex-col items-center justify-center mt-12 gap-4">
          <button
            onClick={handleEditPhoneClick}
            className="btn btn-neutral btn-xl py-12 w-full max-w-xl justify-start gap-4"
          >
            <PhoneIcon className="size-8" />
            <div className="flex flex-col items-start justify-start">
              <p className="text-lg font-bold">修改手机号</p>
              <p className="text-sm text-neutral-content/70">
                当前手机号：{userInfo?.phone ?? "—"}
              </p>
            </div>
          </button>
          <button
            onClick={signOut}
            className="btn btn-neutral btn-xl py-12 w-full max-w-xl justify-start gap-4"
          >
            <SignOutIcon className="size-8" />
            <div className="flex flex-col items-start justify-start">
              <p className="text-lg font-bold">退出登录</p>
              <p className="text-sm text-neutral-content/70">
                退出登录后，您将需要重新登录
              </p>
            </div>
          </button>
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

      <Modal
        isCloseOnClick
        isOpen={isEditingPhone}
        onToggle={(evt) => {
          if (!evt.open) handleClosePhone();
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
            onClick={handleClosePhone}
            className="btn btn-sm btn-circle absolute top-4 right-4"
            disabled={isLoadingPhone}
          >
            <XIcon className="size-4" weight="bold" />
          </button>

          <h3 className="text-base font-bold px-7 pb-4 flex items-center gap-1">
            修改手机号
          </h3>

          <form
            onSubmit={handlePhoneSubmit}
            className="flex flex-col gap-4 py-4 px-12"
          >
            {smsError && (
              <div role="alert" className="alert alert-error alert-soft">
                <WarningIcon className="text-error size-4" />
                <span>{smsError}</span>
              </div>
            )}

            <label className="flex flex-row gap-2">
              <span className="label text-sm min-w-20">手机号:</span>
              <input
                placeholder="请输入新手机号"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                className="input input-sm flex-1"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSmsError(null);
                }}
                disabled={isLoadingPhone || countdown > 0}
                autoFocus
              />
            </label>

            <label className="flex flex-row gap-2">
              <span className="label text-sm min-w-20">短信验证码:</span>
              <input
                type="text"
                placeholder="六位数字短信验证码"
                className="input input-sm flex-1"
                value={smsForm.code}
                onChange={(e) => {
                  dispatchSmsForm({
                    type: "SET_CODE",
                    payload: e.target.value,
                  });
                  setSmsError(null);
                }}
                maxLength={6}
                disabled={isLoadingPhone}
              />

              <button
                type="button"
                className="btn btn-sm"
                onClick={getSmsCode}
                disabled={countdown > 0 || isLoadingPhone}
              >
                {countdown > 0 ? `${countdown}秒后重试` : "获取验证码"}
              </button>
            </label>

            <div className="flex justify-center">
              <div id="phone-turnstile-container" />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleClosePhone}
                disabled={isLoadingPhone}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={
                  isLoadingPhone ||
                  !phone.trim() ||
                  !smsForm.code ||
                  smsForm.code.length !== 6
                }
              >
                {isLoadingPhone ? "保存中..." : "确认"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
