import { createFileRoute } from "@tanstack/react-router";
import { GuildMailbox } from "@/client/components/dash/trpg/GuildMailbox";
export const Route = createFileRoute("/dash/trpg-mailbox")({
  component: GuildMailbox,
});
