import { useApolloClient } from "@apollo/client";
import { useEffect, useRef, useState } from "react";
import { WechatOpenConfigDocument } from "@/client/graphql/__generated__";
import { useTranslation } from "@/client/hooks/useTranslation";

export default function WechatQREmbed({
  onFallback,
}: {
  onFallback: () => void;
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [_key, setKey] = useState(0);
  const client = useApolloClient();

  useEffect(() => {
    client
      .query({ query: WechatOpenConfigDocument })
      .then(({ data }) => {
        setAppId(data.wechatOpenConfig.appId);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [client]);

  useEffect(() => {
    if (!appId || !containerRef.current) return;

    const redirectUri = encodeURIComponent(
      `${window.location.origin}/api/auth/callback/wechat-open`,
    );
    const state = `wxlogin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const iframe = document.createElement("iframe");
    iframe.src = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
    iframe.style.width = "300px";
    iframe.style.height = "400px";
    iframe.style.border = "none";
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-top-navigation",
    );

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(iframe);
  }, [appId]);

  useEffect(() => {
    if (!loading && !appId) {
      onFallback();
    }
  }, [loading, appId, onFallback]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!appId) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="cursor-pointer rounded-lg overflow-hidden"
        onClick={() => setKey((k) => k + 1)}
        title={t("login.wechatQrRefresh")}
      />
      <p className="text-xs text-base-content/60 text-center">
        {t("login.wechatQrHint")}
      </p>
    </div>
  );
}
