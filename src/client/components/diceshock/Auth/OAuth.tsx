import { useOauthPopupLogin } from "@hono/auth-js/react";
import {
    AppleLogoIcon,
    GithubLogoIcon,
    GoogleLogoIcon,
    NotionLogoIcon,
    TiktokLogoIcon,
    WechatLogoIcon,
} from "@phosphor-icons/react/dist/ssr";

export default function OAuth() {
    const { popUpSignin: popUpSigninGithub } = useOauthPopupLogin("github", {
        callbackUrl: "/auth/success",
    });

    return (
        <div className="w-full h-1/2 shrink-0 grid grid-cols-3 gap-1 px-4 mt-auto">
            <button
                onClick={() => popUpSigninGithub()}
                className="btn btn-success flex-col size-full col-span-2"
            >
                <WechatLogoIcon weight="fill" className="size-5" />
                <p className="text-base">微信</p>
            </button>
            <button
                onClick={() => popUpSigninGithub()}
                className="btn btn-neutral flex-col size-full"
            >
                <GithubLogoIcon weight="fill" className="size-5" />
                <p className="text-base">Github</p>
            </button>

            <button
                onClick={() => popUpSigninGithub()}
                className="btn bg-white/80 text-black flex-col size-full"
            >
                <AppleLogoIcon weight="fill" className="size-5" />
                <p className="text-base">Apple</p>
            </button>
            <button
                onClick={() => popUpSigninGithub()}
                className="btn btn-warning flex-col size-full col-span-2"
            >
                <GoogleLogoIcon weight="fill" className="size-5" />
                <p className="text-base">Google</p>
            </button>

            <button
                onClick={() => popUpSigninGithub()}
                className="btn btn-error size-full"
            >
                <p className="text-sm p-1 font-bold aspect-square rounded-full flex justify-center items-center border-2">
                    Osu!
                </p>
            </button>
            <button
                onClick={() => popUpSigninGithub()}
                className="btn btn-info text-black flex-col size-full"
            >
                <TiktokLogoIcon weight="fill" className="size-5" />
                <p className="text-base">Tiktok</p>
            </button>
            <button
                onClick={() => popUpSigninGithub()}
                className="btn btn-secondary text-black flex-col size-full"
            >
                <NotionLogoIcon weight="fill" className="size-5" />
                <p className="text-base">Notion</p>
            </button>
        </div>
    );
}
