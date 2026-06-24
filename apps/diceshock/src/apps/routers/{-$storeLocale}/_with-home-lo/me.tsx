import { useApolloClient } from "@apollo/client";
import {
  BellIcon,
  CameraIcon,
  ChatsTeardropIcon,
  CopyIcon,
  GameControllerIcon,
  LinkIcon,
  ListBulletsIcon,
  PencilSimpleLineIcon,
  PhoneIcon,
  ScanIcon,
  SignOutIcon,
  StorefrontIcon,
  TranslateIcon,
  TrophyIcon,
  UsersIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import BusinessCardModal from "@/client/components/diceshock/BusinessCardModal";
import QRScannerDialog from "@/client/components/diceshock/Header/QRScannerDialog";
import GszRegistrationModal from "@/client/components/diceshock/MahjongMatch/GszRegistrationModal";
import {
  getPlanConfig,
  getStoredValueBalance,
  isActivePlan,
  type MembershipPlan,
  type PlanType,
} from "@/client/components/diceshock/MembershipBadge";
import TOTPCard from "@/client/components/diceshock/TOTPCard";
import LanguageSelectorModal from "@/client/components/LanguageSelectorModal";
import Modal from "@/client/components/modal";
import StoreSelectorModal from "@/client/components/StoreSelectorModal";
import {
  CaptchaSettingsDocument,
  type CaptchaSettingsQuery,
  MyMahjongRegistrationDocument,
  type MyMahjongRegistrationQuery,
  type UpdateMyUserInfoMutation,
  useGetMyMembershipPlansQuery,
  useUpdateMyPreferencesMutation,
  useUpdateMyUserInfoMutation,
} from "@/client/graphql/__generated__";
import useAuth from "@/client/hooks/useAuth";
import useCrossData from "@/client/hooks/useCrossData";
import { useMessages } from "@/client/hooks/useMessages";
import useSmsCode from "@/client/hooks/useSmsCode";
import { useTranslation } from "@/client/hooks/useTranslation";
import { copyToClipboard } from "@/server/utils";
import {
  LOCALES,
  type LocaleCode,
  STORES,
  type StoreCode,
} from "@/shared/store-locale";
import { cfAvatarUrl } from "@/shared/utils/cfImage";
import dayjs from "@/shared/utils/dayjs-config";

type GqlMembershipPlan = NonNullable<
  NonNullable<
    ReturnType<typeof useGetMyMembershipPlansQuery>["data"]
  >["myMembershipPlans"]
>[number];

function toLocalPlan(plan: GqlMembershipPlan): MembershipPlan {
  return {
    id: plan.id,
    user_id: plan.userId,
    plan_type: plan.planType.toLowerCase() as PlanType,
    amount: plan.amount,
    start_date: plan.startDate ?? null,
    end_date: plan.endDate ?? null,
    create_at: plan.createdAt ?? null,
    update_at: plan.updatedAt ?? null,
  };
}

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

export const Route = createFileRoute("/{-$storeLocale}/_with-home-lo/me")({
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
  const client = useApolloClient();
  const { t } = useTranslation();
  const { userInfo, setUserInfoIm, signOut, session } = useAuth();
  const crossData = useCrossData();
  const ssrUserInfo = crossData?.UserInfo;
  const displayInfo = userInfo ?? ssrUserInfo;

  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(displayInfo?.nickname ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const messages = useMessages();

  const [captchaEnabled, setCaptchaEnabled] = useState(true);

  const isAutoNickname = (userInfo?.meta as { auto_nickname?: boolean } | null)
    ?.auto_nickname;

  const isInWechat =
    typeof navigator !== "undefined" &&
    /MicroMessenger/i.test(navigator.userAgent);

  const { data: membershipPlansData } = useGetMyMembershipPlansQuery();
  const myPlans: MembershipPlan[] = (
    membershipPlansData?.myMembershipPlans ?? []
  ).map(toLocalPlan);

  const [updateMyUserInfo] = useUpdateMyUserInfoMutation();
  const [updateMyPreferences] = useUpdateMyPreferencesMutation();

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
    client
      .query<CaptchaSettingsQuery>({
        query: CaptchaSettingsDocument,
      })
      .then(({ data }) => setCaptchaEnabled(data.captchaSettings.enabled))
      .catch(() => {});
  }, [client]);

  const [prefCount, setPrefCount] = useState(0);
  useEffect(() => {
    setPrefCount(0);
  }, []);

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [isEditingBusinessCard, setIsEditingBusinessCard] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [gszRegistered, setGszRegistered] = useState<boolean | null>(null);
  const [showGszModal, setShowGszModal] = useState(false);
  const [preferredLocale, setPreferredLocale] = useState("");
  const [preferredStore, setPreferredStore] = useState("");
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    const raw = (displayInfo as any)?.avatar_url;
    return raw ? cfAvatarUrl(raw) : null;
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        messages.error("头像大小不能超过 2MB");
        return;
      }

      setIsUploadingAvatar(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const resp = await fetch("/edge/media/avatar", {
          method: "POST",
          body: formData,
        });
        const data = (await resp.json()) as { url?: string; error?: string };
        if (!resp.ok || data.error) {
          messages.error(data.error ?? "上传失败");
          return;
        }
        if (data.url) {
          setAvatarUrl(data.url);
          messages.success("头像已更新");
        }
      } catch {
        messages.error("网络错误");
      } finally {
        setIsUploadingAvatar(false);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
      }
    },
    [messages],
  );

  useEffect(() => {
    client
      .query<MyMahjongRegistrationQuery>({
        query: MyMahjongRegistrationDocument,
      })
      .then(({ data }) =>
        setGszRegistered(data.myMahjongRegistration.registered),
      )
      .catch(() => {});
  }, [client]);

  useEffect(() => {
    const prefs = (displayInfo ?? ssrUserInfo) as
      | Record<string, unknown>
      | null
      | undefined;
    setPreferredLocale(
      typeof prefs?.preferred_locale === "string" ? prefs.preferred_locale : "",
    );
    setPreferredStore(
      typeof prefs?.preferred_store_id === "string"
        ? prefs.preferred_store_id
        : "",
    );
  }, [
    displayInfo?.preferred_locale,
    displayInfo?.preferred_store_id,
    ssrUserInfo,
  ]);

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
        messages.error(t("me.nicknameRequired"));
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
        const { data } = await updateMyUserInfo({
          variables: { input: { nickname: trimmedNickname } },
        });

        const result: UpdateMyUserInfoMutation["updateMyUserInfo"] | null =
          data?.updateMyUserInfo ?? null;

        if (result?.success) {
          if (result.user) {
            const updatedNickname = result.user.nickname ?? "";
            setUserInfoIm((draft) => {
              if (!draft) return undefined;
              (draft as unknown as { nickname: string }).nickname =
                updatedNickname;
              return draft;
            });
            messages.success(t("me.nicknameSuccess"));
            setIsEditing(false);
          } else {
            messages.error(t("me.updateFailed"));
          }
        } else {
          const errorMessage = result?.message ?? t("me.updateFailed");
          messages.error(errorMessage);
        }
      } catch (error) {
        console.error("更新用户信息失败:", error);
        messages.error(t("me.networkError"));
      } finally {
        setIsLoading(false);
      }
    },
    [nickname, userInfo?.nickname, setUserInfoIm, messages, updateMyUserInfo],
  );

  const handleCopyUid = useCallback(async () => {
    if (!displayInfo?.uid) return;

    const uid =
      typeof displayInfo.uid === "string"
        ? displayInfo.uid
        : String(displayInfo.uid);
    const success = await copyToClipboard(uid);
    if (success) {
      messages.success(t("me.copySuccess"));
    } else {
      messages.error(t("me.copyFailed"));
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
        messages.error(t("me.phoneRequired"));
        return;
      }

      if (!smsForm.code || smsForm.code.length !== 6) {
        messages.error(t("me.codeRequired"));
        return;
      }

      setIsLoadingPhone(true);

      try {
        const { data } = await updateMyUserInfo({
          variables: {
            input: { phone: trimmedPhone, code: smsForm.code },
          },
        });

        const result: UpdateMyUserInfoMutation["updateMyUserInfo"] | null =
          data?.updateMyUserInfo ?? null;

        if (result?.success) {
          if (result.user) {
            const updatedPhone = result.user.phone ?? null;
            setUserInfoIm((draft) => {
              if (!draft) return undefined;
              (draft as unknown as { phone: string | null }).phone =
                updatedPhone;
              return draft;
            });
            messages.success(t("me.phoneSuccess"));
            handleClosePhone();
          } else {
            messages.error(t("me.updateFailed"));
          }
        } else {
          const errorMessage = result?.message ?? t("me.updateFailed");
          messages.error(errorMessage);
        }
      } catch (error) {
        console.error("更新手机号失败:", error);
        messages.error(t("me.networkError"));
      } finally {
        setIsLoadingPhone(false);
      }
    },
    [
      phone,
      smsForm.code,
      setUserInfoIm,
      messages,
      handleClosePhone,
      updateMyUserInfo,
    ],
  );

  const [isStoreSelectorOpen, setIsStoreSelectorOpen] = useState(false);

  const handleSaveLocale = useCallback(
    async (locale: string) => {
      setPreferredLocale(locale);
      setIsSavingPrefs(true);
      try {
        await updateMyPreferences({
          variables: {
            input: {
              preferredLocale: locale || null,
              preferredStoreId: preferredStore || null,
            },
          },
        });
        window.location.reload();
      } catch {
        messages.error(t("me.networkError"));
        setIsSavingPrefs(false);
      }
    },
    [preferredStore, messages, updateMyPreferences],
  );

  const handleSaveStore = useCallback(
    async (store: string) => {
      setPreferredStore(store);
      setIsStoreSelectorOpen(false);
      setIsSavingPrefs(true);
      try {
        await updateMyPreferences({
          variables: {
            input: {
              preferredLocale: preferredLocale || null,
              preferredStoreId: store || null,
            },
          },
        });
        window.location.reload();
      } catch {
        messages.error(t("me.networkError"));
        setIsSavingPrefs(false);
      }
    },
    [preferredLocale, messages, updateMyPreferences],
  );

  return (
    <>
      <main className="min-h-[calc(100vh-8rem)] w-full px-4 pt-6 pb-12">
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col items-center gap-1 mb-6">
            <div className="relative mb-2">
              <button
                type="button"
                className="relative group"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label="上传头像"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="头像"
                    className="size-20 rounded-full object-cover border-2 border-primary/30"
                  />
                ) : (
                  <div className="size-20 rounded-full bg-primary text-primary-content flex items-center justify-center text-2xl font-bold">
                    {(() => {
                      const name = displayInfo?.nickname ?? "A";
                      return /^[\x20-\x7E\u00A0-\u024F\u0400-\u04FF]/.test(name)
                        ? name.slice(0, 2).toUpperCase()
                        : name.slice(0, 1);
                    })()}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingAvatar ? (
                    <span className="loading loading-spinner loading-sm text-white" />
                  ) : (
                    <CameraIcon className="size-5 text-white" />
                  )}
                </div>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
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

          <section className="mb-5">
            {(() => {
              const activePlans = myPlans.filter(isActivePlan);
              const totalBalance = getStoredValueBalance(myPlans);
              const hasActivePlans = activePlans.length > 0;

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

              return (
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrophyIcon className="size-5 text-primary" />
                    <h2 className="text-sm font-bold text-primary">
                      {t("me.membership")}
                    </h2>
                  </div>

                  {hasActivePlans && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {uniquePlans.map((plan) => {
                        const config = getPlanConfig(plan.plan_type);
                        const Icon = config.icon;
                        return (
                          <div
                            key={plan.plan_type}
                            className="flex items-center gap-2.5 bg-base-100/80 backdrop-blur rounded-xl px-3.5 py-2.5 border border-base-content/5 flex-1 min-w-[130px]"
                          >
                            <Icon className="size-7 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">
                                {config.label}
                              </p>
                              <p className="text-[10px] text-base-content/50">
                                {plan.end_date
                                  ? t("me.expiryDate", {
                                      date: dayjs(plan.end_date).format(
                                        "MM/DD",
                                      ),
                                    })
                                  : plan.plan_type === "stored_value"
                                    ? t("me.balance", {
                                        amount: (totalBalance / 100).toFixed(0),
                                      })
                                    : t("me.permanent")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-primary/10">
                    <div>
                      <span className="text-xs text-base-content/60">
                        储值余额
                      </span>
                      <span className="text-lg font-bold text-primary ml-2">
                        ¥{(totalBalance / 100).toFixed(0)}
                      </span>
                    </div>
                    <Link
                      to="/{-$storeLocale}/diceshock-agents"
                      className="btn btn-primary btn-sm"
                    >
                      查看会员计划
                    </Link>
                  </div>
                </div>
              );
            })()}
          </section>

          <section className="mb-4">
            <SectionHeader title={t("me.quickActions")} />
            <div className="grid grid-cols-3 gap-1 bg-base-200 rounded-2xl p-2 border border-base-content/5">
              <QuickAction
                icon={UsersIcon}
                label={t("me.actives")}
                href="/actives"
              />
              <QuickAction
                icon={ScanIcon}
                label={t("me.scan")}
                onClick={() => setIsQRScannerOpen(true)}
              />
              <QuickAction
                icon={ListBulletsIcon}
                label={t("me.inventory")}
                href="/inventory"
              />
            </div>
          </section>

          <section className="mb-4">
            <SectionHeader title="偏好" />
            <Link
              to="/{-$storeLocale}/preferences"
              className="flex items-center gap-3 bg-base-200 hover:bg-base-300 rounded-2xl px-4 py-4 border border-base-content/5 transition-colors"
            >
              <div className="shrink-0 p-2 bg-primary/10 rounded-lg">
                <BellIcon className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">约局偏好</p>
                <p className="text-xs text-base-content/50">
                  {prefCount > 0
                    ? `${prefCount} 条偏好已设置`
                    : "添加偏好, 系统自动为你匹配约局"}
                </p>
              </div>
              {prefCount > 0 && (
                <span className="badge badge-primary badge-sm">
                  {prefCount}
                </span>
              )}
            </Link>
          </section>

          <section className="mb-4">
            <SectionHeader title={t("me.mahjong")} />
            <div className="grid grid-cols-3 gap-1 bg-base-200 rounded-2xl p-2 border border-base-content/5">
              <QuickAction
                icon={TrophyIcon}
                label={t("me.leaderboard")}
                href="/riichi"
              />
              <QuickAction
                icon={GameControllerIcon}
                label={t("me.matchHistory")}
                href={
                  session?.user?.id
                    ? `/my-riichi/${session.user.id}`
                    : "/riichi"
                }
              />
              <QuickAction
                icon={LinkIcon}
                label={gszRegistered ? t("me.alreadyBound") : t("me.bind")}
                onClick={
                  gszRegistered ? undefined : () => setShowGszModal(true)
                }
                disabled={gszRegistered === true}
              />
            </div>
          </section>

          <section className="mb-4">
            <SectionHeader title={t("me.account")} />
            <div className="bg-base-200 rounded-2xl border border-base-content/5 overflow-hidden">
              <TOTPCard />

              <div className="border-t border-base-content/5">
                <ListItem
                  icon={PhoneIcon}
                  label={t("me.changePhone")}
                  sublabel={
                    displayInfo?.phone
                      ? t("me.currentPhone", { phone: displayInfo.phone })
                      : t("me.notBound")
                  }
                  onClick={handleEditPhoneClick}
                />
              </div>

              <div className="border-t border-base-content/5">
                <ListItem
                  icon={ChatsTeardropIcon}
                  label={t("me.editBusinessCard")}
                  sublabel={t("me.businessCardDesc")}
                  onClick={() => setIsEditingBusinessCard(true)}
                />
              </div>

              {!isInWechat && (
                <div className="border-t border-base-content/5">
                  <ListItem
                    icon={SignOutIcon}
                    label={t("me.logout")}
                    onClick={signOut}
                    danger
                  />
                </div>
              )}
            </div>
          </section>

          <section className="mb-4">
            <SectionHeader title={t("me.preferences")} />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex flex-col items-center gap-2 bg-base-200 rounded-2xl border border-base-content/5 p-4 hover:bg-base-300 active:bg-base-300 transition-colors"
                onClick={() => setIsLangModalOpen(true)}
                disabled={isSavingPrefs}
              >
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <TranslateIcon className="size-5 text-primary" />
                </div>
                <div className="text-center min-w-0 w-full">
                  <p className="text-xs text-base-content/50">
                    {t("me.preferredLang")}
                  </p>
                  <p className="text-sm font-medium truncate">
                    {preferredLocale
                      ? LOCALES[preferredLocale as LocaleCode]?.name
                      : t("me.defaultOption")}
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex flex-col items-center gap-2 bg-base-200 rounded-2xl border border-base-content/5 p-4 hover:bg-base-300 active:bg-base-300 transition-colors"
                onClick={() => setIsStoreSelectorOpen(true)}
                disabled={isSavingPrefs}
              >
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <StorefrontIcon className="size-5 text-primary" />
                </div>
                <div className="text-center min-w-0 w-full">
                  <p className="text-xs text-base-content/50">
                    {t("me.preferredStore")}
                  </p>
                  <p className="text-sm font-medium truncate">
                    {preferredStore
                      ? STORES[preferredStore as StoreCode]?.shortName
                      : "未选择"}
                  </p>
                </div>
              </button>
            </div>
          </section>
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
            {t("me.editNickname")}
          </h3>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:gap-4 py-2 sm:py-4 px-4 sm:px-6 md:px-12"
          >
            <label className="flex flex-col sm:flex-row gap-2">
              <span className="label text-xs sm:text-sm min-w-16 sm:min-w-20 pt-1">
                {t("me.nicknameLabel")}
              </span>
              <input
                type="text"
                placeholder={t("me.nicknamePlaceholder")}
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
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={
                  isLoading ||
                  !(typeof nickname === "string" && nickname.trim())
                }
              >
                {isLoading ? t("common.saving") : t("common.confirm")}
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
            {t("me.changePhone")}
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
              <span className="label text-sm min-w-20">
                {t("me.phoneLabel")}
              </span>
              <input
                placeholder={t("me.phonePlaceholder")}
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
              <span className="label text-sm min-w-20">
                {t("me.verificationCode")}
              </span>
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  placeholder={t("me.codePlaceholder")}
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
                  {countdown > 0 ? `${countdown}s` : t("me.getCode")}
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
                {t("common.cancel")}
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
                {isLoadingPhone ? t("common.saving") : t("common.confirm")}
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
          messages.success(t("me.gszBindSuccess"));
        }}
        onSkip={() => setShowGszModal(false)}
        phone={displayInfo?.phone ?? null}
        nickname={displayInfo?.nickname ?? ""}
      />

      <QRScannerDialog
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />

      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        currentLocale={(preferredLocale as LocaleCode) || "zh_Hans"}
        onSelect={(loc) => handleSaveLocale(loc)}
      />

      <StoreSelectorModal
        isOpen={isStoreSelectorOpen}
        onClose={() => setIsStoreSelectorOpen(false)}
        currentStore={preferredStore as StoreCode | ""}
        onSelect={(store) => handleSaveStore(store)}
      />
    </>
  );
}
