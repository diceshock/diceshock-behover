import { EyeIcon, PlusIcon, SignInIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
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
};

export default function ActiveRegistration({
  activeId,
  allowWatching = false,
}: ActiveRegistrationProps) {
  const { session } = useAuth();
  const messages = useMessages();
  const [teams, setTeams] = useState<Team[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const userId = session?.user?.id;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentRegistration = registrations.find(
    (r) => r.user_id === userId,
  );

  const handleJoin = useCallback(
    async (teamId: string | null, isWatching: boolean) => {
      if (!userId) {
        messages.warning("请先登录");
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
        await fetchData();
      } catch (error) {
        messages.error(
          error instanceof Error ? error.message : "操作失败，请稍后重试",
        );
      } finally {
        setJoining(null);
      }
    },
    [activeId, userId, messages, fetchData],
  );

  const handleLeave = useCallback(async () => {
    if (!currentRegistration) return;

    try {
      await trpcClientPublic.activeRegistrations.registrations.delete.mutate(
        {
          id: currentRegistration.id,
        },
      );
      messages.success("已退出");
      await fetchData();
    } catch (error) {
      messages.error(
        error instanceof Error ? error.message : "操作失败，请稍后重试",
      );
    }
  }, [currentRegistration, messages, fetchData]);

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

  // 统计信息 - 队伍数量 + 观望（如果允许）
  const totalOptions = teams.length + (allowWatching ? 1 : 0);

  return (
    <div className="mb-8">
      {/* 统计信息 */}
      <div className="mb-4 text-sm text-base-content/70">
        <span>共 {totalOptions} 个选项</span>
      </div>

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
                  <h3 className="card-title text-lg">{team.name}</h3>
                  {isCurrentTeam && (
                    <span className="badge badge-primary badge-sm">已加入</span>
                  )}
                </div>
                {team.description && (
                  <p className="text-sm text-base-content/70 mb-3">
                    {team.description}
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
                      disabled={joining !== null || (team.is_full && !isCurrentTeam)}
                      title={team.is_full && !isCurrentTeam ? "队伍已满" : "加入"}
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
    </div>
  );
}
