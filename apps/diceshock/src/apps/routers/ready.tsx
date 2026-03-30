import { ClientOnly, createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import LoginDialog from "@/client/components/diceshock/Header/LoginDialog";
import useAuth from "@/client/hooks/useAuth";
import useTempIdentity from "@/client/hooks/useTempIdentity";

export const Route = createFileRoute("/ready")({
  component: ReadyLayout,
});

function ReadyLayout() {
  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <header className="w-full py-3 px-4 text-center border-b border-base-200">
        <span className="font-bold text-sm tracking-wide text-base-content/70">
          DiceShock ⚡ 使用
        </span>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <ClientOnly>
        <AuthGate />
      </ClientOnly>
    </div>
  );
}

function AuthGate() {
  const { userInfo, status } = useAuth();
  const { tempIdentity, initialized } = useTempIdentity();
  const [dismissed, setDismissed] = useState(false);

  if (!initialized) return null;

  if (
    userInfo ||
    tempIdentity ||
    dismissed ||
    status === "loading" ||
    status === "authenticated"
  )
    return null;

  return <LoginDialog isOpen onClose={() => setDismissed(true)} isSeatPage />;
}
