import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import Footer from "@/client/components/diceshock/Footer";
import Header from "@/client/components/diceshock/Header";
import Msg from "@/client/components/diceshock/Msg";
import useCrossData from "@/client/hooks/useCrossData";

export const Route = createFileRoute("/_with-home-lo")({
  component: _Home,
});

function _Home() {
  const location = useLocation();
  const crossData = useCrossData();
  const isInWechat = useMemo(() => {
    const ua =
      crossData?.UserAgentMeta?.userAgent ??
      (typeof navigator !== "undefined" ? navigator.userAgent : "");
    return /MicroMessenger/i.test(ua);
  }, [crossData?.UserAgentMeta?.userAgent]);
  const isMePage = location.pathname === "/me";
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
