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
import ParticipantsCardModal from "@/client/components/diceshock/ParticipantsCardModal";
import TiptapViewer from "@/client/components/diceshock/TiptapEditor/TiptapViewer";
import useAuth from "@/client/hooks/useAuth";
import { useMessages } from "@/client/hooks/useMessages";
import { useTranslation } from "@/client/hooks/useTranslation";
import dayjs from "@/shared/utils/dayjs-config";
import trpcClientPublic from "@/shared/utils/trpc";

const SITE_URL = "https://origin.runespark.fun";

export const Route = createFileRoute(
  "/{-$storeLocale}/_with-home-lo/actives_/$id",
)({
  head: ({ params }) => ({
    meta: [
      { title: "约局详情 - DiceShock 骰子奇兵" },
      { name: "description", content: "查看约局详情，加入桌游社区" },
      { property: "og:title", content: "约局详情 - DiceShock 骰子奇兵" },
      { property: "og:description", content: "查看约局详情，加入桌游社区" },
      {
        property: "og:image",
        content: `${SITE_URL}/edge/media/card/active/${params.id}`,
      },
      { property: "og:url", content: `${SITE_URL}/actives/${params.id}` },
    ],
  }),
  component: ActiveDetailPage,
});

type ActiveDetail = Awaited<
  ReturnType<typeof trpcClientPublic.actives.getById.query>
>;

function ActiveDetailPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { userInfo, session } = useAuth();
  const messages = useMessages();
  const navigate = useNavigate();

  const [active, setActive] = useState<ActiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBusinessCard, setShowBusinessCard] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

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
      messages.error(t("errors.loadActiveFailed"));
    } finally {
      setLoading(false);
    }
  }, [id, messages, t]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const handleJoin = useCallback(
    async (isWatching: boolean) => {
      if (!userId) {
        messages.warning(t("actives.needLogin"));
        return;
      }

      if (!isWatching && !myRegistration) {
        try {
          setActionLoading(true);
          const card =
            await trpcClientPublic.businessCard.getMyBusinessCard.query({});
          if (!card) {
            setActionLoading(false);
            setShowBusinessCard(true);
            return;
          }
        } catch {
          setActionLoading(false);
          setShowBusinessCard(true);
          return;
        }
      } else {
        setActionLoading(true);
      }

      try {
        await trpcClientPublic.actives.join.mutate({
          active_id: id,
          is_watching: isWatching,
        });
        messages.success(
          isWatching ? t("actives.setWatching") : t("actives.joinSuccess"),
        );
        fetchActive();
      } catch (error) {
        messages.error(
          error instanceof Error ? error.message : t("errors.operationFailed"),
        );
      } finally {
        setActionLoading(false);
      }
    },
    [userId, id, messages, fetchActive, myRegistration, t],
  );

  const handleJoinAfterBusinessCard = useCallback(async () => {
    setShowBusinessCard(false);
    setActionLoading(true);
    try {
      await trpcClientPublic.actives.join.mutate({
        active_id: id,
        is_watching: false,
      });
      messages.success(t("actives.joinSuccess"));
      fetchActive();
    } catch (error) {
      messages.error(
        error instanceof Error ? error.message : t("actives.joinFailed"),
      );
    } finally {
      setActionLoading(false);
    }
  }, [id, messages, fetchActive, t]);

  const handleLeave = useCallback(async () => {
    setActionLoading(true);
    try {
      await trpcClientPublic.actives.leave.mutate({ active_id: id });
      messages.success(t("actives.leaveSuccess"));
      fetchActive();
    } catch (error) {
      messages.error(t("errors.operationFailed"));
    } finally {
      setActionLoading(false);
    }
  }, [id, messages, fetchActive, t]);

  const openParticipantsModal = useCallback(() => {
    setShowParticipantsModal(true);
  }, []);

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
          <p className="text-lg text-base-content/60">
            {t("actives.notFound")}
          </p>
          <Link to="/actives" className="btn btn-ghost mt-4">
            {t("actives.backToList")}
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
            ← {t("actives.backToList")}
          </Link>

          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  {active.title}
                </h1>
                {isExpired && (
                  <span className="badge badge-ghost shrink-0">
                    {t("actives.expired")}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1 mt-2">
                {isCreator && (
                  <span className="badge badge-accent badge-xs">
                    {t("actives.creator")}
                  </span>
                )}
                {!isCreator &&
                  myRegistration &&
                  !myRegistration.is_watching && (
                    <span className="badge badge-primary badge-xs">
                      {t("actives.joined")}
                    </span>
                  )}
                {!isCreator && myRegistration?.is_watching && (
                  <span className="badge badge-ghost badge-xs">
                    {t("actives.watching")}
                  </span>
                )}
                {active.boardGames?.map(
                  (g) =>
                    g && (
                      <span key={g.id} className="badge badge-primary badge-xs">
                        🎲 {g.sch_name || g.eng_name}
                      </span>
                    ),
                )}
              </div>
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
                {joinedCount}/{active.max_players}{" "}
                {t("actives.joinedCountLabel")}
                {watchingCount > 0 && (
                  <span className="text-base-content/40">
                    · {watchingCount} {t("actives.watchingLabel")}
                  </span>
                )}
              </span>
              <span className="text-base-content/40">
                {t("actives.creatorLabel")}
                {active.creator.name ?? "Anonymous"}
              </span>
            </div>

            {active.content && (
              <div className="card bg-base-200 border border-base-content/10">
                <div className="card-body p-4 sm:p-6">
                  <TiptapViewer content={active.content} />
                </div>
              </div>
            )}

            {!isExpired && !isCreator && (
              <div className="flex flex-wrap gap-3">
                {!userId ? (
                  <button
                    type="button"
                    className="btn btn-primary gap-2"
                    onClick={() => messages.warning(t("actives.needLogin"))}
                  >
                    <SignInIcon className="size-5" />
                    {t("actives.loginToJoin")}
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
                        {isFull ? t("actives.full") : t("actives.switchToJoin")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost gap-2"
                        onClick={() => handleJoin(true)}
                        disabled={actionLoading}
                      >
                        <EyeIcon className="size-5" />
                        {t("actives.switchToWatching")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-error gap-2"
                      onClick={handleLeave}
                      disabled={actionLoading}
                    >
                      {t("actives.leave")}
                    </button>
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
                      {isFull ? t("actives.full") : t("actives.joinButton")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost gap-2"
                      onClick={() => handleJoin(true)}
                      disabled={actionLoading}
                    >
                      <EyeIcon className="size-5" />
                      {t("actives.watchFirst")}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="card bg-base-200 border border-base-content/10">
              <div className="card-body p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">
                    {t("actives.participants", { count: joinedCount })}
                  </h3>
                  {isCreator && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={openParticipantsModal}
                    >
                      {t("actives.viewBusinessCard")}
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
                  <p className="text-sm text-base-content/40">
                    {t("actives.noParticipants")}
                  </p>
                )}

                {watchingCount > 0 && (
                  <>
                    <h3 className="font-bold text-sm mt-4 mb-2">
                      {t("actives.watchingSection", { count: watchingCount })}
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
          </div>
        </div>
      </main>

      <BusinessCardModal
        isOpen={showBusinessCard}
        onClose={() => setShowBusinessCard(false)}
        onSuccess={handleJoinAfterBusinessCard}
        required
      />

      <ParticipantsCardModal
        isOpen={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        activeId={id}
      />
    </ClientOnly>
  );
}
