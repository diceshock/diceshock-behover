import { createFileRoute } from "@tanstack/react-router";
import Agents from "@/client/components/diceshock/Agents";

export const Route = createFileRoute("/_with-home-lo/diceshock-agents")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Agents className="mt-20 sm:mt-32 md:mt-40" />;
}
