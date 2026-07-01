import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useRef } from "react";
import HookHole from "@/client/assets/svg/hook-hole.svg?react";
import QQ from "@/client/assets/svg/tencent-qq.svg?react";
import Wechat from "@/client/assets/svg/wechat.svg?react";
import CopyItem from "@/client/components/diceshock/CopyItem";
import Swing from "@/client/components/diceshock/Swing";
import { useStoreContext } from "@/client/hooks/useStoreContext";
import { useTranslation } from "@/client/hooks/useTranslation";

export const Route = createFileRoute(
  "/{-$storeLocale}/_with-home-lo/contact-us",
)({
  component: RouteComponent,
});

const STORE_CONTACTS = {
  gg: { wechat: "DiceShock", label: "光谷天地店客服:" },
  jdk: { wechat: "DiceShockJDK", label: "街道口店客服:" },
} as const;

const WECHAT_OA_URL = "http://weixin.qq.com/r/mp/7Cc3L1TEcgkNrRBM93L_";

function RouteComponent() {
  const { t } = useTranslation();
  const { storeCode } = useStoreContext();
  const current = STORE_CONTACTS[storeCode] ?? STORE_CONTACTS.gg;
  const other = storeCode === "jdk" ? STORE_CONTACTS.gg : STORE_CONTACTS.jdk;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, WECHAT_OA_URL, {
      width: 180,
      margin: 1,
    }).catch(() => {});
  }, []);

  return (
    <>
      <h1 className="w-full text-6xl font-black text-center my-20">
        CONTACT US
      </h1>

      <div className="w-full min-h-screen flex flex-wrap justify-center items-start mt-20">
        <Swing>
          <div className="card bg-base-200 h-[30rem] w-[20rem] shadow-xl border-b-2 border-base-300 mb-10 mx-10">
            <figure className="relative h-[15rem] bg-accent text-black">
              <HookHole className="absolute text-base-100 left-1/2 top-[0.90rem] -translate-x-1/2 w-14" />

              <QQ className="size-12" />
            </figure>

            <div className="card-body justify-start">
              <h2 className="card-title">{t("contact.contactUsQQ")}</h2>
              <div>
                <br />
                <p>
                  <b>{t("contact.qqGroupLabel")}</b>
                </p>

                {<CopyItem tx="930828672" />}

                <br />
                <p>
                  <b>{t("contact.hostGahon")}</b>
                </p>

                {<CopyItem tx="519576792" />}
              </div>
            </div>
          </div>
        </Swing>

        <Swing>
          <div className="card bg-base-200 h-[30rem] w-[20rem] shadow-xl border-b-2 border-base-300 mb-10 mx-10">
            <figure className="relative h-[15rem] bg-primary text-black">
              <HookHole className="absolute text-base-100 left-1/2 top-[0.90rem] -translate-x-1/2 w-14" />

              <Wechat className="size-14" />
            </figure>
            <div className="card-body justify-start">
              <h2 className="card-title">{t("contact.contactUsWechat")}</h2>
              <div>
                <br />
                <p>
                  <b>{current.label}</b>
                </p>

                {<CopyItem tx={current.wechat} />}

                <br />
                <p>
                  <b>{other.label}</b>
                </p>

                {<CopyItem tx={other.wechat} />}

                <br />
                <p>
                  <b>{t("contact.hostHygge")}</b>
                </p>

                {<CopyItem tx="GahonTian" />}
              </div>
            </div>
          </div>
        </Swing>

        <Swing>
          <div className="card bg-base-200 h-[30rem] w-[20rem] shadow-xl border-b-2 border-base-300 mb-10 mx-10">
            <figure className="relative h-[15rem] bg-success text-black">
              <HookHole className="absolute text-base-100 left-1/2 top-[0.90rem] -translate-x-1/2 w-14" />

              <Wechat className="size-14" />
            </figure>
            <div className="card-body items-center">
              <h2 className="card-title">{t("contact.officialAccount")}</h2>
              <p className="text-sm opacity-70">DiceShockDS</p>
              <canvas ref={canvasRef} className="mt-2" />
            </div>
          </div>
        </Swing>
      </div>
    </>
  );
}
