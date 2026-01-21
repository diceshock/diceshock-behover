import { createRootRoute, Outlet, Scripts } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: _Home,
});

function _Home() {
  return (
    <>
      <Outlet />
      <Scripts />
    </>
  );
}
