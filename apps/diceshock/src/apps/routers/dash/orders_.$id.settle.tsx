import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dash/orders_/$id/settle")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/dash/orders/settle",
      search: { ids: params.id },
    });
  },
  component: () => null,
});
