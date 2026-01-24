import {
  EyeIcon,
  PlusIcon,
  ShareNetworkIcon,
  SignInIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import BusinessCardModal from "@/client/components/diceshock/BusinessCardModal";
import useAuth from "@/client/hooks/useAuth";
import { useMessages } from "@/client/hooks/useMessages";
import trpcClientPublic from "@/shared/utils/trpc";

type Team = Awaited<
  ReturnType<typeof trpcClientPublic.activeRegistrations.teams.get.query>
>[number];

type Registration = Awaited<
  ReturnType<
    typeof trpcClientPublic.activeRegistrations.registrations.get.query
  >
>[number];

type ActiveRegistrationProps = {
  activeId: string;
  allowWatching?: boolean;
  isGame?: boolean;
};

export default function ActiveRegistration({
  activeId,
  allowWatching = false,
  isGame = false,
}: ActiveRegistrationProps) {
  const { session } = useAuth();
  const messages = useMessages();
  const [teams, setTeams] = useState<Team[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [showBusinessCardModal, setShowBusinessCardModal] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<{
    teamId: string | null;
    isWatching: boolean;
  } | null>(null);

  const userId = session?.user?.id;
  const [businessCard, setBusinessCard] = useState<{
    share_phone: boolean | null;
    wechat: string | null;
    qq: string | null;
    custom_content: string | null;
  } | null>(null);
  const [isLoadingBusinessCard, setIsLoadingBusinessCard] = useState(false);

  // 检查是否有名片
  useEffect(() => {
    if (!userId || !isGame) return;

    const fetchBusinessCard = async () => {
      try {
        setIsLoadingBusinessCard(true);
        const data = await trpcClientPublic.businessCard.getMyBusinessCard.query({});
        setBusinessCard(data);
      } catch (error) {
        console.error("获取名片失败", error);
      } finally {
        setIsLoadingBusinessCard(false);
      }
    };

    fetchBusinessCard();
  }, [userId, isGame]);

  const fetchData = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true);
        }
        const [teamsData, registrationsData] = await Promise.all([
          trpcClientPublic.activeRegistrations.teams.get.query({
            active_id: activeId,
          }),
          trpcClientPublic.activeRegistrations.registrations.get.query({
            active_id: activeId,
          }),
        ]);
        setTeams(teamsData);
        setRegistrations(registrationsData);
      } catch (error) {
        console.error("获取报名信息失败", error);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [activeId],
  );

  useEffect(() => {
    // 首次加载时显示 loading
    fetchData(true);
  }, [fetchData]);

  const currentRegistration = registrations.find((r) => r.user_id === userId);

  const handleJoin = useCallback(
    async (teamId: string | null, isWatching: boolean) => {
      if (!userId) {
        messages.warning("请先登录");
        return;
      }

      // 如果是约局且没有名片，先要求填写名片
      if (isGame && !isWatching && !businessCard) {
        setPendingJoin({ teamId, isWatching });
        setShowBusinessCardModal(true);
        return;
      }

      try {
        setJoining(teamId || "watching");
        await trpcClientPublic.activeRegistrations.registrations.create.mutate({
          active_id: activeId,
          team_id: teamId || undefined,
          is_watching: isWatching,
        });
        messages.success(isWatching ? "已加入观望" : "加入成功");
        // 不显示 loading，避免闪烁
        await fetchData(false);
      } catch (error) {
        messages.error(
          error instanceof Error ? error.message : "操作失败，请稍后重试",
        );
      } finally {
        setJoining(null);
      }
    },
    [activeId, userId, messages, fetchData, isGame, businessCard],
  );

  // 名片保存成功后的回调
  const handleBusinessCardSuccess = useCallback(async () => {
    setShowBusinessCardModal(false);
    if (pendingJoin) {
      // 重新获取名片信息
      await new Promise((resolve) => setTimeout(resolve, 100));
      // 继续报名流程
      const { teamId, isWatching } = pendingJoin;
      setPendingJoin(null);
      try {
        setJoining(teamId || "watching");
        await trpcClientPublic.activeRegistrations.registrations.create.mutate({
          active_id: activeId,
          team_id: teamId || undefined,
          is_watching: isWatching,
        });
        messages.success("加入成功");
        await fetchData(false);
      } catch (error) {
        messages.error(
          error instanceof Error ? error.message : "操作失败，请稍后重试",
        );
      } finally {
        setJoining(null);
      }
    }
  }, [pendingJoin, activeId, messages, fetchData]);

  const handleLeave = useCallback(async () => {
    if (!currentRegistration) return;

    try {
      await trpcClientPublic.activeRegistrations.registrations.delete.mutate({
        id: currentRegistration.id,
      });
      messages.success("已退出");
      // 不显示 loading，避免闪烁
      await fetchData(false);
    } catch (error) {
      messages.error(
        error instanceof Error ? error.message : "操作失败，请稍后重试",
      );
    }
  }, [currentRegistration, messages, fetchData]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "约局报名",
          text: "一起来参加这个约局吧！",
          url,
        });
        messages.success("分享成功");
      } else {
        // 降级方案：复制链接到剪贴板
        await navigator.clipboard.writeText(url);
        messages.success("链接已复制到剪贴板");
      }
    } catch (error) {
      // 用户取消分享或复制失败
      if (error instanceof Error && error.name !== "AbortError") {
        // 如果分享失败，尝试复制
        try {
          await navigator.clipboard.writeText(url);
          messages.success("链接已复制到剪贴板");
        } catch {
          messages.error("分享失败，请手动复制链接");
        }
      }
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <span className="loading loading-spinner loading-sm"></span>
      </div>
    );
  }

  if (teams.length === 0) {
    return null; // 如果没有队伍，不显示报名组件
  }

  const isInTeam = (teamId: string | null) => {
    if (!currentRegistration) return false;
    if (teamId === null) {
      return currentRegistration.is_watching;
    }
    return (
      currentRegistration.team_id === teamId && !currentRegistration.is_watching
    );
  };

  const isWatching = currentRegistration?.is_watching ?? false;

  return (
    <div className="mb-8">
      {/* 约局标题和分享按钮 */}
      {isGame && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">报名参加</h2>
          <button
            className="btn btn-sm btn-outline"
            onClick={handleShare}
            title="分享"
          >
            <ShareNetworkIcon className="size-4" />
            分享
          </button>
        </div>
      )}
      {/* 队伍和观望卡片列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* 队伍卡片 */}
        {teams.map((team) => {
          const isCurrentTeam = isInTeam(team.id);
          return (
            <div
              key={team.id}
              className={clsx(
                "card border-2",
                isCurrentTeam
                  ? "border-primary bg-primary/5"
                  : "border-base-300 bg-base-100",
              )}
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="card-title text-lg">
                    {isGame ? "参加约局" : team.name || "队伍"}
                  </h3>
                  {isCurrentTeam && (
                    <span className="badge badge-primary badge-sm">已加入</span>
                  )}
                </div>
                {(team.description || isGame) && (
                  <p className="text-sm text-base-content/70 mb-3">
                    {isGame ? "报名参加并分享你的名片给组织者" : team.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/50">
                    {team.current_count}
                    {team.max_participants !== null
                      ? ` / ${team.max_participants} 人`
                      : " 人"}
                    {team.is_full && !isCurrentTeam && (
                      <span className="text-error ml-2">（已满）</span>
                    )}
                  </span>
                  {isCurrentTeam ? (
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={handleLeave}
                      title="退出"
                    >
                      <XIcon className="size-4" />
                      退出
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleJoin(team.id, false)}
                      disabled={
                        joining !== null || (team.is_full && !isCurrentTeam)
                      }
                      title={
                        team.is_full && !isCurrentTeam ? "队伍已满" : "加入"
                      }
                    >
                      {joining === team.id ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <>
                          <PlusIcon className="size-4" />
                          加入
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* 观望卡片 - 仅在允许观望时显示 */}
        {allowWatching && (
          <div
            className={clsx(
              "card border-2",
              isWatching
                ? "border-primary bg-primary/5"
                : "border-base-300 bg-base-100",
            )}
          >
            <div className="card-body p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <EyeIcon className="size-5" />
                  <h3 className="card-title text-lg">观望</h3>
                </div>
                {isWatching && (
                  <span className="badge badge-primary badge-sm">已加入</span>
                )}
              </div>
              <p className="text-sm text-base-content/70 mb-3">
                再看看? 人满了? 观望观望
              </p>
              <div className="flex items-center justify-end">
                {isWatching ? (
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleLeave}
                    title="退出观望"
                  >
                    <XIcon className="size-4" />
                    退出
                  </button>
                ) : (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleJoin(null, true)}
                    disabled={joining !== null}
                    title="观望"
                  >
                    {joining === "watching" ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <PlusIcon className="size-4" />
                        加入
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {!userId && (
        <div className="card border border-base-300 bg-base-200/50">
          <div className="card-body p-4">
            <div className="flex items-center gap-2">
              <SignInIcon className="size-4" />
              <span className="text-sm text-base-content/50">请登录后加入</span>
            </div>
          </div>
        </div>
      )}

      {/* 名片编辑弹窗（报名时必填） */}
      {isGame && (
        <BusinessCardModal
          isOpen={showBusinessCardModal}
          onClose={() => {
            setShowBusinessCardModal(false);
            setPendingJoin(null);
          }}
          onSuccess={handleBusinessCardSuccess}
          required={true}
        />
      )}
    </div>
  );
}
