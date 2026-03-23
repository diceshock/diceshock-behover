import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";

type DashBackButtonProps = {
  to?: string;
  label?: string;
};

export default function DashBackButton({
  to = "/dash",
  label = "返回仪表盘",
}: DashBackButtonProps) {
  return (
    <Link to={to} className="btn btn-ghost btn-sm gap-2 mb-4">
      <ArrowLeftIcon className="size-4" />
      {label}
    </Link>
  );
}
