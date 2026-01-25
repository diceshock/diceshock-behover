import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import ActiveDetail from "@/client/components/diceshock/ActiveDetail";
import { useMsg } from "@/client/components/diceshock/Msg";
import { trpcClientDash } from "@/shared/utils/trpc";

export const Route = createFileRoute("/dash/active/$id/preview")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const msg = useMsg();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Awaited<
    ReturnType<typeof trpcClientDash.active.getById.query>
  > | null>(null);

  const fetchActive = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await trpcClientDash.active.getById.query({ id });
      setActive(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const handlePublish = useCallback(async () => {
    if (!active) return;
    try {
      await (trpcClientDash.active as any).mutation.mutate({
        id: active.id,
        is_published: true,
      });
      msg.success("发布成功");
      await fetchActive();
    } catch (error) {
      msg.error("发布失败");
      console.error("发布失败", error);
    }
  }, [active, fetchActive, msg]);

  const handleEdit = useCallback(() => {
    navigate({
      to: "/dash/active/$id",
      params: { id },
    });
  }, [id, navigate]);

  if (loading) {
    return (
      <main className="size-full p-4 flex items-center justify-center min-h-screen">
        <span className="loading loading-dots loading-md"></span>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="size-full p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">活动不存在</h2>
          <Link to="/dash/acitve" className="btn btn-primary">
            返回列表
          </Link>
        </div>
      </main>
    );
  }

  return (
    <ActiveDetail
      active={active}
      activeId={id}
      isPreview={true}
      onPublish={handlePublish}
      onEdit={handleEdit}
    />
  );
}
