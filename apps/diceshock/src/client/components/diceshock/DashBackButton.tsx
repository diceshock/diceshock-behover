import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";
import { DashNavMenuButton } from "@/client/components/diceshock/DashNavMenu";

type DashBackButtonProps = {
  to?: string;
  params?: Record<string, string>;
};

export default function DashBackButton({
  to = "/dash",
  params,
}: DashBackButtonProps) {
  return (
    <div className="flex items-center gap-1">
      <Link to={to} params={params} className="btn btn-ghost btn-square btn-sm">
        <ArrowLeftIcon className="size-5" />
      </Link>
      <DashNavMenuButton />
    </div>
  );
}
