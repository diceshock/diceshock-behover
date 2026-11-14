import { createFileRoute } from "@tanstack/react-router";
import { TrpgWorkbench } from "@/client/components/dash/TrpgWorkbench";

export const Route = createFileRoute("/dash/trpg")({
  component: TrpgWorkbench,
});
