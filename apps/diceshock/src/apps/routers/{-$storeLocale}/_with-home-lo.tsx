import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import Footer from "@/client/components/diceshock/Footer";
import Header from "@/client/components/diceshock/Header";
import Msg from "@/client/components/diceshock/Msg";
import useCrossData from "@/client/hooks/useCrossData";

export const Route = createFileRoute("/{-$storeLocale}/_with-home-lo")({
  component: HomeLayout,
});

function WechatFooter() {
  return (
    <footer className="w-full py-4 text-center text-xs text-base-content/40">
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        className="link link-hover"
      >
        鄂ICP备2026020241号-1
      </a>
      <span className="mx-2">·</span>
      <span>powered by diceshock.com</span>
    </footer>
  );
}

function HomeLayout() {
  const location = useLocation();
  const crossData = useCrossData();
  const isInWechat = useMemo(() => {
    const ua =
      crossData?.UserAgentMeta?.userAgent ??
      (typeof navigator !== "undefined" ? navigator.userAgent : "");
    return /MicroMessenger/i.test(ua);
  }, [crossData?.UserAgentMeta?.userAgent]);

  const hideHeader = isInWechat && location.pathname === "/me";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {!hideHeader && <Header />}

      <Outlet />

      {isInWechat ? <WechatFooter /> : <Footer />}

      <Msg />
    </>
  );
}
