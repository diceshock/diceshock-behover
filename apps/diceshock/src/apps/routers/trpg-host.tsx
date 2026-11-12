import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TrpgWorkbench } from "@/client/components/dash/TrpgWorkbench";
import LoginDialog from "@/client/components/diceshock/Header/LoginDialog";
import useAuth from "@/client/hooks/useAuth";

export const Route = createFileRoute("/trpg-host")({ component: HostRoute });

function HostRoute() {
  return <ClientOnly><HostWorkbench /></ClientOnly>;
}

function HostWorkbench() {
  const { session, status } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  if (status === "loading") return <p className="p-4">正在加载账户…</p>;
  if (session?.user) return <TrpgWorkbench />;
  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-2xl font-bold">主持人工作台</h1>
      <button className="btn btn-primary" onClick={() => setShowLogin(true)}>登录 DiceShock</button>
      {showLogin && <LoginDialog isOpen onClose={() => setShowLogin(false)} />}
    </main>
  );
}
