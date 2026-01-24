import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import trpcClientPublic from "@/shared/utils/trpc";
import ActiveDetail from "@/client/components/diceshock/ActiveDetail";

export const Route = createFileRoute("/_with-home-lo/active/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Awaited<
    ReturnType<typeof trpcClientPublic.active.getById.query>
  > | null>(null);

  const fetchActive = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await trpcClientPublic.active.getById.query({ id });
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
          <Link to="/" className="btn btn-primary">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  // 只显示已发布且未删除的活动
  if (!active.is_published || active.is_deleted) {
    return (
      <main className="size-full p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">活动不可用</h2>
          <Link to="/" className="btn btn-primary">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  return <ActiveDetail active={active} activeId={id} isPreview={false} />;
}
