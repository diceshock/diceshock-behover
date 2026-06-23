import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/x")({
  component: ReferenceLayout,
});

function ReferenceLayout() {
  return (
    <div className="min-h-screen bg-base-100">
      <Outlet />
    </div>
  );
}
