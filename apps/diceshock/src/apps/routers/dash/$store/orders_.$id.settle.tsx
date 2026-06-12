import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dash/$store/orders_/$id/settle")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/dash/$store/orders/settle",
      params: { store: params.store },
      search: { ids: [params.id] },
    });
  },
  component: () => null,
});
