import { createFileRoute } from "@tanstack/react-router";
import { RewardsManagement } from "@/client/components/dash/trpg/RewardsManagement";
export const Route = createFileRoute("/dash/trpg-rewards")({ component: RewardsManagement });
