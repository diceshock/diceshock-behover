import { createFileRoute } from "@tanstack/react-router";

import QQ from "@/client/assets/svg/tencent-qq.svg?react";
import Wechat from "@/client/assets/svg/wechat.svg?react";
import HookHole from "@/client/assets/svg/hook-hole.svg?react";
import Swing from "@/client/components/diceshock/Swing";
import CopyItem from "@/client/components/diceshock/CopyItem";

export const Route = createFileRoute("/_with-home-lo/contact-us")({
    component: RouteComponent,
});

function RouteComponent() {
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
                            <h2 className="card-title">通过 QQ 联系我们</h2>
                            <div>
                                <br />
                                <p>
                                    <b>QQ群(DiceShock桌游·日麻·主机):</b>
                                </p>

                                {<CopyItem tx="930828672" />}

                                <br />
                                <p>
                                    <b>联系主理人辣条(ID: Gahon):</b>
                                </p>

                                {<CopyItem tx="519576792" />}
                            </div>
                        </div>
                    </div>
                </Swing>

                <Swing>
                    <div className="card bg-base-200 h-[24rem] w-[20rem] shadow-xl border-b-2 border-base-300 mb-10 mx-10">
                        <figure className="relative h-[15rem] bg-primary text-black">
                            <HookHole className="absolute text-base-100 left-1/2 top-[0.90rem] -translate-x-1/2 w-14" />

                            <Wechat className="size-14" />
                        </figure>
                        <div className="card-body justify-start">
                            <h2 className="card-title">通过微信联系我们</h2>
                            <div>
                                <br />
                                <p>
                                    <b>联系主理人辣条(ID: Hygge):</b>
                                </p>

                                {<CopyItem tx="GahonTian" />}
                            </div>
                        </div>
                    </div>
                </Swing>
            </div>
        </>
    );
}
