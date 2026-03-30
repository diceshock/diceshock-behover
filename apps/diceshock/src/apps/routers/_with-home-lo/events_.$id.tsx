import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import MarkdownViewer from "@/client/components/diceshock/MarkdownEditor/MarkdownViewer";
import { useMessages } from "@/client/hooks/useMessages";
import dayjs from "@/shared/utils/dayjs-config";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute("/_with-home-lo/events_/$id")({
  component: EventDetailPage,
});

type EventDetail = Awaited<
  ReturnType<typeof trpcClientPublic.events.getById.query>
>;

function EventDetailPage() {
  const { id } = Route.useParams();
  const messages = useMessages();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const result = await trpcClientPublic.events.getById.query({ id });
      setEvent(result);
    } catch (error) {
      console.error("Failed to fetch event:", error);
      messages.error("加载活动失败");
    } finally {
      setLoading(false);
    }
  }, [id, messages]);

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
          <p className="text-lg text-base-content/60">活动不存在</p>
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
            {event.cover_image_url && (
              <figure className="rounded-lg overflow-hidden">
                <img
                  src={event.cover_image_url}
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
                {event.create_at &&
                  dayjs(event.create_at).format("YYYY年MM月DD日 HH:mm")}
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
