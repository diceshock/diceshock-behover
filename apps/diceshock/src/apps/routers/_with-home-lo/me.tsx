import {
  ChatsTeardropIcon,
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
import BusinessCardModal from "@/client/components/diceshock/BusinessCardModal";
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

  // 名片编辑相关状态
  const [isEditingBusinessCard, setIsEditingBusinessCard] = useState(false);

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

      const trimmedNickname =
        typeof nickname === "string" ? nickname.trim() : "";
      if (!trimmedNickname) {
        messages.error("昵称不能为空");
        return;
      }

      const currentNickname =
        typeof userInfo?.nickname === "string" ? userInfo.nickname : "";
      if (trimmedNickname === currentNickname) {
        setIsEditing(false);
        return;
      }

      setIsLoading(true);

      try {
        const result = await trpcClientPublic.auth.updateUserInfo.mutate({
          nickname: trimmedNickname,
        });

        if (result.success) {
          if ("data" in result && result.data) {
            const updatedNickname =
              typeof result.data.nickname === "string"
                ? result.data.nickname
                : "";
            setUserInfoIm((draft) => {
              if (!draft) return undefined;
              (draft as unknown as { nickname: string }).nickname =
                updatedNickname;
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

    const uid =
      typeof userInfo.uid === "string" ? userInfo.uid : String(userInfo.uid);
    const success = await copyToClipboard(uid);
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

      const trimmedPhone = typeof phone === "string" ? phone.trim() : "";
      if (!trimmedPhone) {
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
          phone: trimmedPhone,
          code: smsForm.code,
        });

        if (result.success) {
          if ("data" in result && result.data) {
            const updatedPhone =
              typeof result.data.phone === "string"
                ? result.data.phone
                : result.data.phone === null
                  ? null
                  : "";
            setUserInfoIm((draft) => {
              if (!draft) return undefined;
              (draft as unknown as { phone: string | null }).phone =
                updatedPhone;
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
      <main className="min-h-[calc(100vh-32rem)] w-full flex-col items-center mt-20 sm:mt-32 md:mt-40 px-4">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex flex-col items-center gap-3 mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl text-center align-baseline flex items-center gap-2 flex-wrap justify-center">
              <span className="break-words">
                {userInfo?.nickname ?? "Anonymous Shock"}
              </span>
              <button
                className="btn btn-ghost btn-circle btn-sm sm:btn-md shrink-0"
                onClick={handleEditClick}
                aria-label="编辑昵称"
              >
                <PencilSimpleLineIcon className="size-4 sm:size-5 md:size-6" />
              </button>
            </h1>
            <h2 className="text-xs sm:text-sm text-center text-base-content/50 flex items-center gap-1.5 flex-wrap justify-center">
              <span>uid: {userInfo?.uid}</span>
              <button
                className="btn btn-ghost btn-xs btn-circle shrink-0"
                onClick={handleCopyUid}
                aria-label="复制UID"
              >
                <CopyIcon className="size-3 sm:size-4" />
              </button>
            </h2>
          </div>

          <div className="w-full flex flex-col items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={handleEditPhoneClick}
              className="card bg-base-200 hover:bg-base-300 transition-colors w-full cursor-pointer border border-base-content/10 hover:border-base-content/20 shadow-sm hover:shadow-md"
            >
              <div className="card-body p-4 sm:p-6 md:p-8">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="shrink-0 p-2 sm:p-2.5 bg-primary/10 rounded-lg">
                    <PhoneIcon className="size-5 sm:size-6 md:size-8 text-primary" />
                  </div>
                  <div className="flex flex-col items-start justify-start flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-bold mb-1">
                      修改手机号
                    </p>
                    <p className="text-xs sm:text-sm text-base-content/60 break-words">
                      当前手机号：{userInfo?.phone ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setIsEditingBusinessCard(true)}
              className="card bg-base-200 hover:bg-base-300 transition-colors w-full cursor-pointer border border-base-content/10 hover:border-base-content/20 shadow-sm hover:shadow-md"
            >
              <div className="card-body p-4 sm:p-6 md:p-8">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="shrink-0 p-2 sm:p-2.5 bg-primary/10 rounded-lg">
                    <ChatsTeardropIcon className="size-5 sm:size-6 md:size-8 text-primary" />
                  </div>
                  <div className="flex flex-col items-start justify-start flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-bold mb-1">
                      登记/修改名片
                    </p>
                    <p className="text-xs sm:text-sm text-base-content/60 break-words">
                      当你报名约局, 组织者可以查看你的名片
                    </p>
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={signOut}
              className="card bg-base-200 hover:bg-base-300 transition-colors w-full cursor-pointer border border-base-content/10 hover:border-base-content/20 shadow-sm hover:shadow-md"
            >
              <div className="card-body p-4 sm:p-6 md:p-8">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="shrink-0 p-2 sm:p-2.5 bg-error/10 rounded-lg">
                    <SignOutIcon className="size-5 sm:size-6 md:size-8 text-error" />
                  </div>
                  <div className="flex flex-col items-start justify-start flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-bold mb-1">
                      退出登录
                    </p>
                    <p className="text-xs sm:text-sm text-base-content/60 break-words">
                      退出登录后，您将需要重新登录
                    </p>
                  </div>
                </div>
              </div>
            </button>
          </div>
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
            "modal-box max-w-none md:max-w-120 min-h-48 sm:min-h-64 max-h-[85vh] sm:max-h-[80vh] rounded-xl px-0 pb-4 flex flex-col",
            "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-visible",
            "border border-base-content/30",
          )}
        >
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle absolute top-3 right-3 sm:top-4 sm:right-4 z-10"
            disabled={isLoading}
            aria-label="关闭"
          >
            <XIcon className="size-4" weight="bold" />
          </button>

          <h3 className="text-sm sm:text-base font-bold px-4 sm:px-7 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-center gap-1">
            修改昵称
          </h3>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:gap-4 py-2 sm:py-4 px-4 sm:px-6 md:px-12"
          >
            <label className="flex flex-col sm:flex-row gap-2">
              <span className="label text-xs sm:text-sm min-w-16 sm:min-w-20 pt-1">
                昵称:
              </span>
              <input
                type="text"
                placeholder="请输入新昵称"
                className="input input-sm sm:input-md flex-1"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
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
                disabled={
                  isLoading ||
                  !(typeof nickname === "string" && nickname.trim())
                }
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
                  !(typeof phone === "string" && phone.trim()) ||
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

      {/* 名片编辑弹窗 */}
      <BusinessCardModal
        isOpen={isEditingBusinessCard}
        onClose={() => setIsEditingBusinessCard(false)}
      />
    </>
  );
}
