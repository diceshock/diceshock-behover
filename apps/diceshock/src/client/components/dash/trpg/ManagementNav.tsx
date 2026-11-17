import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/client/hooks/useTranslation";

export function ManagementNav() {
  const { t } = useTranslation();
  return (
    <nav className="flex flex-wrap gap-2" aria-label={t("trpgOps.navigation")}>
      {(
        [
          ["/dash/trpg", "schedule"],
          ["/dash/trpg-hosts", "hosts"],
          ["/dash/trpg-members", "members"],
          ["/dash/trpg-rewards", "rewards"],
          ["/dash/trpg-mailbox", "mailbox"],
        ] as const
      ).map(([to, key]) => (
        <Link
          key={to}
          to={to}
          className="btn btn-sm min-h-10"
          activeProps={{ className: "btn-neutral" }}
          activeOptions={{ exact: true }}
        >
          {t(`trpgOps.${key}`)}
        </Link>
      ))}
    </nav>
  );
}
