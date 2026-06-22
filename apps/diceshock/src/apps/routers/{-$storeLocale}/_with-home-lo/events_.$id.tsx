import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import MarkdownViewer from "@/client/components/diceshock/MarkdownEditor/MarkdownViewer";
import { useGetEventQuery } from "@/client/graphql/__generated__";
import { useMessages } from "@/client/hooks/useMessages";
import { useTranslation } from "@/client/hooks/useTranslation";
import dayjs from "@/shared/utils/dayjs-config";

const SITE_URL = "https://origin.runespark.fun";

export const Route = createFileRoute(
  "/{-$storeLocale}/_with-home-lo/events_/$id",
)({
  head: ({ params }) => ({
    meta: [
      { title: "活动详情 - DiceShock 骰子奇兵" },
      { name: "description", content: "查看活动详情和报名信息" },
      { property: "og:title", content: "活动详情 - DiceShock 骰子奇兵" },
      { property: "og:description", content: "查看活动详情和报名信息" },
      {
        property: "og:image",
        content: `${SITE_URL}/edge/media/card/event/${params.id}`,
      },
      { property: "og:url", content: `${SITE_URL}/events/${params.id}` },
    ],
  }),
  component: EventDetailPage,
});

type EventDetail = NonNullable<
  ReturnType<typeof useGetEventQuery>["data"]
>["event"];

function EventDetailPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const messages = useMessages();

  const { data, loading, refetch } = useGetEventQuery({ variables: { id } });
  const event = data?.event ?? null;

  const fetchEvent = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-3xl flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-3xl text-center py-20">
          <p className="text-lg text-base-content/60">{t("events.notFound")}</p>
          <Link to="/{-$storeLocale}/actives" className="btn btn-ghost mt-4">
            {t("common.backToList")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <ClientOnly>
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-3xl">
          <Link
            to="/{-$storeLocale}/actives"
            className="btn btn-ghost btn-sm mb-6 -ml-2"
          >
            ← {t("common.backToList")}
          </Link>

          <div className="flex flex-col gap-6">
            {event.coverImageUrl && (
              <figure className="rounded-lg overflow-hidden">
                <img
                  src={event.coverImageUrl}
                  alt={event.title}
                  className="w-full max-h-80 object-cover"
                />
              </figure>
            )}

            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                {event.title}
              </h1>
              {event.description && (
                <p className="mt-2 text-base-content/60">{event.description}</p>
              )}
              <div className="mt-2 text-xs text-base-content/40">
                {event.createdAt &&
                  dayjs(event.createdAt).format("YYYY年MM月DD日 HH:mm")}
              </div>
            </div>

            {event.content && (
              <div className="card bg-base-200 border border-base-content/10">
                <div className="card-body p-4 sm:p-6">
                  <MarkdownViewer content={event.content} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </ClientOnly>
  );
}
