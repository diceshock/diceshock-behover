import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useMemo } from "react";
import Footer from "@/client/components/diceshock/Footer";
import Header from "@/client/components/diceshock/Header";
import Msg from "@/client/components/diceshock/Msg";
import useCrossData from "@/client/hooks/useCrossData";

export const Route = createFileRoute("/_with-home-lo")({
  component: _Home,
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

function _Home() {
  const crossData = useCrossData();
  const isInWechat = useMemo(() => {
    const ua =
      crossData?.UserAgentMeta?.userAgent ??
      (typeof navigator !== "undefined" ? navigator.userAgent : "");
    return /MicroMessenger/i.test(ua);
  }, [crossData?.UserAgentMeta?.userAgent]);

  return (
    <>
      {!isInWechat && <Header />}

      <Outlet />

      {isInWechat ? <WechatFooter /> : <Footer />}

      <Msg />
    </>
  );
}
