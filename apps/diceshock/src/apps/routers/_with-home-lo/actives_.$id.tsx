import {
  CalendarBlankIcon,
  ClockIcon,
  EyeIcon,
  HandIcon,
  SignInIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import BusinessCardModal from "@/client/components/diceshock/BusinessCardModal";
import TiptapViewer from "@/client/components/diceshock/TiptapEditor/TiptapViewer";
import useAuth from "@/client/hooks/useAuth";
import { useMessages } from "@/client/hooks/useMessages";
import dayjs from "@/shared/utils/dayjs-config";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute("/_with-home-lo/actives_/$id")({
  component: ActiveDetailPage,
});

type ActiveDetail = Awaited<
  ReturnType<typeof trpcClientPublic.actives.getById.query>
>;

function ActiveDetailPage() {
  const { id } = Route.useParams();
  const { userInfo, session } = useAuth();
  const messages = useMessages();
  const navigate = useNavigate();

  const [active, setActive] = useState<ActiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBusinessCard, setShowBusinessCard] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<
    Awaited<ReturnType<typeof trpcClientPublic.actives.getParticipants.query>>
  >([]);

  const userId = session?.user?.id;
  const isCreator = active && userId && active.creator_id === userId;

  const myRegistration = active?.registrations.find(
    (r) => r.user_id === userId,
  );
  const joinedCount =
    active?.registrations.filter((r) => !r.is_watching).length ?? 0;
  const watchingCount =
    active?.registrations.filter((r) => r.is_watching).length ?? 0;
  const isFull = active ? joinedCount >= active.max_players : false;
  const isExpired = active
    ? active.date < dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD")
    : false;

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      const result = await trpcClientPublic.actives.getById.query({ id });
      setActive(result);
    } catch (error) {
      console.error("Failed to fetch active:", error);
      messages.error("加载约局失败");
    } finally {
      setLoading(false);
    }
  }, [id, messages]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const handleJoin = useCallback(
    async (isWatching: boolean) => {
      if (!userId) {
        messages.warning("请先登录");
        return;
      }

      if (!isWatching && !myRegistration) {
        setShowBusinessCard(true);
        return;
      }

      setActionLoading(true);
      try {
        await trpcClientPublic.actives.join.mutate({
          active_id: id,
          is_watching: isWatching,
        });
        messages.success(isWatching ? "已设为观望" : "已加入约局！");
        fetchActive();
      } catch (error) {
        messages.error(error instanceof Error ? error.message : "操作失败");
      } finally {
        setActionLoading(false);
      }
    },
    [userId, id, messages, fetchActive, myRegistration],
  );

  const handleJoinAfterBusinessCard = useCallback(async () => {
    setShowBusinessCard(false);
    setActionLoading(true);
    try {
      await trpcClientPublic.actives.join.mutate({
        active_id: id,
        is_watching: false,
      });
      messages.success("已加入约局！");
      fetchActive();
    } catch (error) {
      messages.error(error instanceof Error ? error.message : "加入失败");
    } finally {
      setActionLoading(false);
    }
  }, [id, messages, fetchActive]);

  const handleLeave = useCallback(async () => {
    setActionLoading(true);
    try {
      await trpcClientPublic.actives.leave.mutate({ active_id: id });
      messages.success("已退出约局");
      fetchActive();
    } catch (error) {
      messages.error("操作失败");
    } finally {
      setActionLoading(false);
    }
  }, [id, messages, fetchActive]);

  const fetchParticipants = useCallback(async () => {
    try {
      const result = await trpcClientPublic.actives.getParticipants.query({
        active_id: id,
      });
      setParticipants(result);
      setShowParticipants(true);
    } catch (error) {
      messages.error("获取参与者信息失败");
    }
  }, [id, messages]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-3xl flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-3xl text-center py-20">
          <p className="text-lg text-base-content/60">约局不存在</p>
          <Link to="/actives" className="btn btn-ghost mt-4">
            返回列表
          </Link>
        </div>
      </main>
    );
  }

  return (
    <ClientOnly>
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-3xl">
          <Link to="/actives" className="btn btn-ghost btn-sm mb-6 -ml-2">
            ← 返回列表
          </Link>

          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  {active.title}
                </h1>
                {isExpired && (
                  <span className="badge badge-ghost shrink-0">已过期</span>
                )}
              </div>

              {active.boardGame && (
                <span className="badge badge-primary mt-3">
                  🎲 {active.boardGame.sch_name || active.boardGame.eng_name}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-base-content/70">
              <span className="flex items-center gap-1.5">
                <CalendarBlankIcon className="size-4" />
                {dayjs(active.date).format("YYYY年MM月DD日")}
              </span>
              {active.time && (
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="size-4" />
                  {active.time}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <UsersIcon className="size-4" />
                {joinedCount}/{active.max_players} 已加入
                {watchingCount > 0 && (
                  <span className="text-base-content/40">
                    · {watchingCount} 观望
                  </span>
                )}
              </span>
              <span className="text-base-content/40">
                发起人: {active.creator.name ?? "Anonymous"}
              </span>
            </div>

            {active.content && (
              <div className="card bg-base-200 border border-base-content/10">
                <div className="card-body p-4 sm:p-6">
                  <TiptapViewer content={active.content} />
                </div>
              </div>
            )}

            {!isExpired && (
              <div className="flex flex-wrap gap-3">
                {!userId ? (
                  <button
                    type="button"
                    className="btn btn-primary gap-2"
                    onClick={() => messages.warning("请先登录")}
                  >
                    <SignInIcon className="size-5" />
                    登录后加入
                  </button>
                ) : myRegistration ? (
                  <>
                    {myRegistration.is_watching ? (
                      <button
                        type="button"
                        className="btn btn-primary gap-2"
                        onClick={() => handleJoin(false)}
                        disabled={actionLoading || isFull}
                      >
                        <HandIcon className="size-5" />
                        {isFull ? "人数已满" : "改为加入"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost gap-2"
                        onClick={() => handleJoin(true)}
                        disabled={actionLoading}
                      >
                        <EyeIcon className="size-5" />
                        改为观望
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-error gap-2"
                      onClick={handleLeave}
                      disabled={actionLoading}
                    >
                      退出
                    </button>
                    <span
                      className={clsx(
                        "badge badge-lg",
                        myRegistration.is_watching
                          ? "badge-ghost"
                          : "badge-primary",
                      )}
                    >
                      {myRegistration.is_watching ? "观望中" : "已加入"}
                    </span>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary gap-2"
                      onClick={() => handleJoin(false)}
                      disabled={actionLoading || isFull}
                    >
                      <HandIcon className="size-5" />
                      {isFull ? "人数已满" : "加入约局"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost gap-2"
                      onClick={() => handleJoin(true)}
                      disabled={actionLoading}
                    >
                      <EyeIcon className="size-5" />
                      先观望
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="card bg-base-200 border border-base-content/10">
              <div className="card-body p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">参与者 ({joinedCount})</h3>
                  {isCreator && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={fetchParticipants}
                    >
                      查看名片
                    </button>
                  )}
                </div>

                {active.registrations.filter((r) => !r.is_watching).length >
                0 ? (
                  <div className="flex flex-wrap gap-2">
                    {active.registrations
                      .filter((r) => !r.is_watching)
                      .map((r) => (
                        <span key={r.id} className="badge badge-primary">
                          {r.nickname}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-base-content/40">还没有人加入</p>
                )}

                {watchingCount > 0 && (
                  <>
                    <h3 className="font-bold text-sm mt-4 mb-2">
                      观望 ({watchingCount})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {active.registrations
                        .filter((r) => r.is_watching)
                        .map((r) => (
                          <span key={r.id} className="badge badge-ghost">
                            {r.nickname}
                          </span>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {showParticipants && participants.length > 0 && isCreator && (
              <div className="card bg-base-200 border border-primary/20">
                <div className="card-body p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-primary">
                      参与者名片
                    </h3>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setShowParticipants(false)}
                    >
                      收起
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 bg-base-100 rounded-lg border border-base-300"
                      >
                        <div>
                          <p className="font-semibold text-sm">{p.nickname}</p>
                          <p className="text-xs text-base-content/50">
                            uid: {p.uid}
                          </p>
                        </div>
                        <span
                          className={clsx(
                            "badge badge-sm",
                            p.is_watching ? "badge-ghost" : "badge-primary",
                          )}
                        >
                          {p.is_watching ? "观望" : "已加入"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <BusinessCardModal
        isOpen={showBusinessCard}
        onClose={() => setShowBusinessCard(false)}
        onSuccess={handleJoinAfterBusinessCard}
        required
      />
    </ClientOnly>
  );
}
