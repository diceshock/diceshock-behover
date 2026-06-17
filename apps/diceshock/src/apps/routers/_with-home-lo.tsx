import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useMemo } from "react";
import Footer from "@/client/components/diceshock/Footer";
import Header from "@/client/components/diceshock/Header";
import Msg from "@/client/components/diceshock/Msg";

function isWechatBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

export const Route = createFileRoute("/_with-home-lo")({
  component: _Home,
});

function _Home() {
  const matches = useMatches();
  const isInWechat = useMemo(() => isWechatBrowser(), []);
  const isMePage = matches.some((m) => m.id === "/_with-home-lo/me");
  const showLayout = !(isInWechat && isMePage);

  return (
    <>
      {showLayout && <Header />}

      <Outlet />

      {showLayout && <Footer />}

      <Msg />
    </>
  );
}
