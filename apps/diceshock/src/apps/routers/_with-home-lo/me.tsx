import {
  ChatsTeardropIcon,
  CopyIcon,
  GameControllerIcon,
  LinkIcon,
  ListBulletsIcon,
  PencilSimpleLineIcon,
  PhoneIcon,
  QrCodeIcon,
  ScanIcon,
  SignOutIcon,
  TrophyIcon,
  UsersIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import BusinessCardModal from "@/client/components/diceshock/BusinessCardModal";
import QRScannerDialog from "@/client/components/diceshock/Header/QRScannerDialog";
import GszRegistrationModal from "@/client/components/diceshock/MahjongMatch/GszRegistrationModal";
import {
  getPlanConfig,
  getStoredValueBalance,
  isActivePlan,
  type MembershipPlan,
} from "@/client/components/diceshock/MembershipBadge";
import TOTPCard from "@/client/components/diceshock/TOTPCard";
import Modal from "@/client/components/modal";
import useAuth from "@/client/hooks/useAuth";
import useCrossData from "@/client/hooks/useCrossData";
import { useMessages } from "@/client/hooks/useMessages";
import useSmsCode from "@/client/hooks/useSmsCode";
import { copyToClipboard } from "@/server/utils";
import dayjs from "@/shared/utils/dayjs-config";
import trpcClientPublic from "@/shared/utils/trpc";

function MeSkeleton() {
  return (
    <main className="min-h-[calc(100vh-8rem)] w-full px-4 pt-6 pb-12">
      <div className="mx-auto w-full max-w-md">
        <div className="flex flex-col items-center gap-1 mb-6">
          <div className="skeleton h-7 w-36 rounded-lg" />
          <div className="skeleton h-3.5 w-24 rounded" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="skeleton h-20 w-full rounded-xl" />
          <div className="skeleton h-20 w-full rounded-xl" />
          <div className="skeleton h-52 w-full rounded-xl" />
        </div>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/_with-home-lo/me")({
  component: RouteComponent,
  pendingComponent: MeSkeleton,
});

function QuickAction({
  icon: Icon,
  label,
  onClick,
  href,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const cls = clsx(
    "flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-colors",
    disabled
      ? "opacity-40 cursor-not-allowed"
      : "hover:bg-base-300 active:bg-base-300 cursor-pointer",
  );

  const content = (
    <>
      <Icon className="size-6 text-primary" />
      <span className="text-xs font-medium text-base-content/80">{label}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link to={href} className={cls}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {content}
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-bold text-base-content/50 uppercase tracking-wider px-1 mb-2">
      {title}
    </h3>
  );
}

function ListItem({
  icon: Icon,
  label,
  sublabel,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-base-300 active:bg-base-300 transition-colors text-left"
    >
      <div
        className={clsx(
          "shrink-0 p-2 rounded-lg",
          danger ? "bg-error/10" : "bg-primary/10",
        )}
      >
        <Icon
          className={clsx("size-4", danger ? "text-error" : "text-primary")}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx("text-sm font-medium", danger && "text-error")}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-base-content/50 truncate">{sublabel}</p>
        )}
      </div>
    </button>
  );
}

function RouteComponent() {
  const { userInfo, setUserInfoIm, signOut, session } = useAuth();
  const crossData = useCrossData();
  const ssrUserInfo = crossData?.UserInfo;
  const displayInfo = userInfo ?? ssrUserInfo;

  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(displayInfo?.nickname ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const messages = useMessages();

  const [myPlans, setMyPlans] = useState<MembershipPlan[]>([]);
  const [captchaEnabled, setCaptchaEnabled] = useState(true);

  const isAutoNickname = (userInfo?.meta as { auto_nickname?: boolean } | null)
    ?.auto_nickname;

  const isInWechat =
    typeof navigator !== "undefined" &&
    /MicroMessenger/i.test(navigator.userAgent);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!/MicroMessenger/i.test(navigator.userAgent)) return;
    if (!isAutoNickname) return;
    if (localStorage.getItem("__wx_nickname_auth_attempted")) return;

    localStorage.setItem("__wx_nickname_auth_attempted", "1");

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signin/wechat-mp";

    const callbackInput = document.createElement("input");
    callbackInput.type = "hidden";
    callbackInput.name = "callbackUrl";
    callbackInput.value = window.location.href;
    form.appendChild(callbackInput);

    const csrfInput = document.createElement("input");
    csrfInput.type = "hidden";
    csrfInput.name = "csrfToken";
    form.appendChild(csrfInput);

    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((d: any) => {
        csrfInput.value = d.csrfToken;
        document.body.appendChild(form);
        form.submit();
      })
      .catch(() => {});
  }, [isAutoNickname]);

  useEffect(() => {
    trpcClientPublic.settings.getCaptchaEnabled
      .query()
      .then((res) => setCaptchaEnabled(res.enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    trpcClientPublic.membershipPlans.getMyPlans
      .query()
      .then((data) => setMyPlans(data as MembershipPlan[]))
      .catch(() => {});
  }, []);

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [isEditingBusinessCard, setIsEditingBusinessCard] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [gszRegistered, setGszRegistered] = useState<boolean | null>(null);
  const [showGszModal, setShowGszModal] = useState(false);

  useEffect(() => {
    trpcClientPublic.mahjong.checkRegistration
      .query()
      .then((result) => setGszRegistered(result.registered))
      .catch(() => {});
  }, []);

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
    containerId: "#phone-captcha-container",
    enabled: isEditingPhone && import.meta.env.PROD && captchaEnabled,
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
    if (!displayInfo?.uid) return;

    const uid =
      typeof displayInfo.uid === "string"
        ? displayInfo.uid
        : String(displayInfo.uid);
    const success = await copyToClipboard(uid);
    if (success) {
      messages.success("复制成功");
    } else {
      messages.error("复制失败，请稍后重试");
    }
  }, [displayInfo?.uid, messages]);

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
      <main className="min-h-[calc(100vh-8rem)] w-full px-4 pt-6 pb-12">
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col items-center gap-1 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-center flex items-center gap-1.5">
              <span className="break-words">
                {displayInfo?.nickname ?? "Anonymous Shock"}
              </span>
              <button
                className="btn btn-ghost btn-circle btn-xs"
                onClick={handleEditClick}
                aria-label="编辑昵称"
              >
                <PencilSimpleLineIcon className="size-3.5" />
              </button>
            </h1>
            <p className="text-xs text-base-content/50 flex items-center gap-1">
              <span>uid: {displayInfo?.uid}</span>
              <button
                className="btn btn-ghost btn-xs btn-circle"
                onClick={handleCopyUid}
                aria-label="复制UID"
              >
                <CopyIcon className="size-3" />
              </button>
            </p>
          </div>

          <section className="mb-4">
            <SectionHeader title="快捷" />
            <div className="grid grid-cols-3 gap-1 bg-base-200 rounded-2xl p-2 border border-base-content/5">
              <QuickAction icon={UsersIcon} label="约局" href="/actives" />
              <QuickAction
                icon={ScanIcon}
                label="扫码"
                onClick={() => setIsQRScannerOpen(true)}
              />
              <QuickAction
                icon={ListBulletsIcon}
                label="桌游库存"
                href="/inventory"
              />
            </div>
          </section>

          <section className="mb-4">
            <SectionHeader title="日麻" />
            <div className="grid grid-cols-3 gap-1 bg-base-200 rounded-2xl p-2 border border-base-content/5">
              <QuickAction icon={TrophyIcon} label="排行榜" href="/riichi" />
              <QuickAction
                icon={GameControllerIcon}
                label="战绩"
                href={
                  session?.user?.id
                    ? `/my-riichi/${session.user.id}`
                    : "/riichi"
                }
              />
              <QuickAction
                icon={LinkIcon}
                label={gszRegistered ? "已绑定" : "绑定"}
                onClick={
                  gszRegistered ? undefined : () => setShowGszModal(true)
                }
                disabled={gszRegistered === true}
              />
            </div>
          </section>

          <section className="mb-4">
            <SectionHeader title="账号" />
            <div className="bg-base-200 rounded-2xl border border-base-content/5 overflow-hidden">
              <div className="p-3">
                <TOTPCard />
              </div>

              <div className="border-t border-base-content/5">
                <ListItem
                  icon={QrCodeIcon}
                  label="活动验证码"
                  sublabel="扫码签到入场"
                  onClick={() => setIsQRScannerOpen(true)}
                />
              </div>

              <div className="border-t border-base-content/5">
                <ListItem
                  icon={PhoneIcon}
                  label="修改手机号"
                  sublabel={
                    displayInfo?.phone ? `当前: ${displayInfo.phone}` : "未绑定"
                  }
                  onClick={handleEditPhoneClick}
                />
              </div>

              <div className="border-t border-base-content/5">
                <ListItem
                  icon={ChatsTeardropIcon}
                  label="登记/修改名片"
                  sublabel="管理联系方式名片"
                  onClick={() => setIsEditingBusinessCard(true)}
                />
              </div>

              {!isInWechat && (
                <div className="border-t border-base-content/5">
                  <ListItem
                    icon={SignOutIcon}
                    label="退出登录"
                    onClick={signOut}
                    danger
                  />
                </div>
              )}
            </div>
          </section>

          {myPlans.filter(isActivePlan).length > 0 && (
            <section className="mb-4">
              <SectionHeader title="会员" />
              <div className="flex flex-wrap gap-3">
                {(() => {
                  const activePlans = myPlans.filter(isActivePlan);
                  const seen = new Set<string>();
                  const uniquePlans = activePlans
                    .sort(
                      (a, b) =>
                        getPlanConfig(a.plan_type).priority -
                        getPlanConfig(b.plan_type).priority,
                    )
                    .filter((plan) => {
                      if (seen.has(plan.plan_type)) return false;
                      seen.add(plan.plan_type);
                      return true;
                    });

                  return uniquePlans.map((plan) => {
                    const config = getPlanConfig(plan.plan_type);
                    const Icon = config.icon;
                    const totalBalance = getStoredValueBalance(myPlans);
                    return (
                      <div
                        key={plan.plan_type}
                        className="flex items-center gap-3 bg-base-200 rounded-xl px-4 py-3 border border-base-content/5 flex-1 min-w-[140px]"
                      >
                        <Icon className="size-8 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">
                            {config.label}
                          </p>
                          <p className="text-[10px] text-base-content/50">
                            {plan.end_date
                              ? `到期: ${dayjs(plan.end_date).format("MM/DD")}`
                              : plan.plan_type === "stored_value"
                                ? `余额: ¥${(totalBalance / 100).toFixed(0)}`
                                : "永久"}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </section>
          )}

          {myPlans.filter(isActivePlan).length === 0 &&
            myPlans.length === 0 && (
              <section className="mb-4">
                <Link
                  to="/diceshock-agents"
                  className="flex items-center gap-3 bg-base-200 hover:bg-base-300 rounded-2xl px-4 py-4 border border-base-content/5 transition-colors"
                >
                  <div className="shrink-0 p-2 bg-primary/10 rounded-lg">
                    <TrophyIcon className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">加入 DiceShock Agents©</p>
                    <p className="text-xs text-base-content/50">
                      了解会员计划权益
                    </p>
                  </div>
                </Link>
              </section>
            )}
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
            className="flex flex-col gap-4 py-4 px-6 sm:px-12"
          >
            {smsError && (
              <div role="alert" className="alert alert-error alert-soft">
                <WarningIcon className="text-error size-4" />
                <span>{smsError}</span>
              </div>
            )}

            <label className="flex flex-col sm:flex-row gap-2">
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

            <label className="flex flex-col sm:flex-row gap-2">
              <span className="label text-sm min-w-20">验证码:</span>
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  placeholder="六位数字"
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
                  id="sms-code-btn"
                  type="button"
                  className="btn btn-sm shrink-0"
                  onClick={getSmsCode}
                  disabled={countdown > 0 || isLoadingPhone}
                >
                  {countdown > 0 ? `${countdown}s` : "获取"}
                </button>
              </div>
            </label>

            {import.meta.env.PROD && captchaEnabled && (
              <div className="flex justify-center">
                <div id="phone-captcha-container" />
              </div>
            )}

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

      <BusinessCardModal
        isOpen={isEditingBusinessCard}
        onClose={() => setIsEditingBusinessCard(false)}
      />

      <GszRegistrationModal
        isOpen={showGszModal}
        onClose={() => setShowGszModal(false)}
        onRegistered={() => {
          setShowGszModal(false);
          setGszRegistered(true);
          messages.success("立直麻将绑定成功");
        }}
        onSkip={() => setShowGszModal(false)}
        phone={displayInfo?.phone ?? null}
        nickname={displayInfo?.nickname ?? ""}
      />

      <QRScannerDialog
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />
    </>
  );
}
