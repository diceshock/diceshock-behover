import { createFileRoute } from "@tanstack/react-router";
import { PeopleManagement } from "@/client/components/dash/trpg/PeopleManagement";

export const Route = createFileRoute("/dash/trpg-members")({
  component: () => <PeopleManagement hostsOnly={false} />,
});
