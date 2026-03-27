import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";
import { DashNavMenuButton } from "@/client/components/diceshock/DashNavMenu";

type DashBackButtonProps = {
  to?: string;
};

export default function DashBackButton({ to = "/dash" }: DashBackButtonProps) {
  return (
    <div className="flex items-center gap-1">
      <Link to={to} className="btn btn-ghost btn-square btn-sm">
        <ArrowLeftIcon className="size-5" />
      </Link>
      <DashNavMenuButton />
    </div>
  );
}
