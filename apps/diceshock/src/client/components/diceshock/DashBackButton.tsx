import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";

export default function DashBackButton() {
  return (
    <Link
      to="/dash"
      className="btn btn-ghost btn-sm gap-2 mb-4"
    >
      <ArrowLeftIcon className="size-4" />
      返回仪表盘
    </Link>
  );
}