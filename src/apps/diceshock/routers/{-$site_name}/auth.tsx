import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import ZdogComponent from "@/client/components/Zdog";
import InPixelFilter from "@/client/components/svg-filters/in-pixel";
import clsx from "clsx";
import { useState } from "react";
import EmailAuth from "@/client/components/diceshock/Auth/Email";
import OAuth from "@/client/components/diceshock/Auth/OAuth";

export const Route = createFileRoute("/{-$site_name}/auth")({
    component: RouteComponent,
});

function RouteComponent() {
    const [activeTab, setActiveTab] = useState<"email" | "phone">("email");

    return (
        <main className="w-full h-[calc(100vh-5rem)] flex px-4">
            <div className="hidden sm:block size-full relative overflow-hidden">
                <ClientOnly>
                    <ZdogComponent />
                </ClientOnly>

                <div className="size-[300%] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [backdrop-filter:url(#inPixelF)] pointer-events-none" />

                <div
                    className="size-[300%] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(var(--color-base-100) 1px, transparent 1px)`,
                        backgroundSize: "3px 3px",
                    }}
                />

                <InPixelFilter />
            </div>

            <div
                className={clsx(
                    "sm:w-120 w-full h-full bg-base-200 shrink-0 p-6",
                    "flex flex-col gap-6 rounded-lg"
                )}
            >
                <h1 className="text-5xl font-bold">
                    注册<span className="text-xl font-medium">/登陆</span>
                </h1>

                <div role="tablist" className="tabs tabs-border">
                    <button
                        role="tab"
                        className={clsx("tab", {
                            "tab-active": activeTab === "email",
                        })}
                        onClick={() => setActiveTab("email")}
                    >
                        邮件
                    </button>
                    <button
                        role="tab"
                        className={clsx("tab", {
                            "tab-active": activeTab === "phone",
                        })}
                        onClick={() => setActiveTab("phone")}
                    >
                        手机
                    </button>
                </div>

                {activeTab === "email" && <EmailAuth />}

                <OAuth />
            </div>
        </main>
    );
}
