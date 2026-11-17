import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TrpgWorkbench } from "@/client/components/dash/TrpgWorkbench";
import LoginDialog from "@/client/components/diceshock/Header/LoginDialog";
import useAuth from "@/client/hooks/useAuth";
import { useTranslation } from "@/client/hooks/useTranslation";

export const Route = createFileRoute("/trpg-host")({ component: HostRoute });
function HostRoute() {
  return (
    <ClientOnly>
      <HostWorkbench />
    </ClientOnly>
  );
}
function HostWorkbench() {
  const { session, status } = useAuth();
  const { t } = useTranslation();
  const [showLogin, setShowLogin] = useState(false);
  if (status === "loading")
    return (
      <p role="status" className="p-4">
        {t("common.loading")}
      </p>
    );
  if (session?.user) return <TrpgWorkbench />;
  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-2xl font-bold">{t("dashNav.trpg")}</h1>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setShowLogin(true)}
      >
        {t("trpg.login")}
      </button>
      {showLogin && <LoginDialog isOpen onClose={() => setShowLogin(false)} />}
    </main>
  );
}
