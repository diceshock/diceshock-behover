import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/dash/orders_/$id/settle")({
  component: RedirectToSettle,
});

function RedirectToSettle() {
  const { id } = Route.useParams();
  return (
    <Navigate
      to="/dash/orders/settle"
      search={{ ids: [id] }}
      replace
    />
  );
}
