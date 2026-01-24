import { signOut } from "@hono/auth-js/react";
import {
  KeyIcon,
  ScanIcon,
  SignOutIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import useAuth from "@/client/hooks/useAuth";
import ThemeSwap from "../../ThemeSwap";
import LoginDialog from "./LoginDialog";

export default function AvatarMenu() {
  const { userInfo } = useAuth();

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  const name = userInfo?.nickname ?? "Anonymous Shock";

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.href = "/";
  };

  return (
    <div className="dropdown dropdown-bottom dropdown-end">
      <div
        tabIndex={0}
        role="button"
        data-tip={name}
        className="btn btn-ghost tooltip tooltip-left rounded-full pl-1"
      >
        <div className="avatar size-8 avatar-placeholder">
          <div className="bg-primary text-gray-900 w-16 rounded-full overflow-hidden">
            <span className="text-lg">{name.slice(0, 2)}</span>
          </div>
        </div>

        <p className="max-w-20 truncate">{name}</p>
      </div>

      <div
        tabIndex={-1}
        className="dropdown-content bg-base-100 rounded-box z-1 p-2 shadow-sm"
      >
        <ul className="menu p-2 w-44">
          {userInfo && (
            <>
              <li>
                <Link
                  to="/me"
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <UserIcon weight="fill" className="size-5" />

                  <span>我的账户</span>
                </Link>
              </li>
              <li>
                <button
                  onClick={handleSignOut}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <SignOutIcon weight="fill" className="size-5" />

                  <span>登出</span>
                </button>
              </li>
            </>
          )}

          {!userInfo && (
            <li>
              <button
                onClick={() => setIsLoginDialogOpen(true)}
                className="px-5 py-3 flex items-center justify-between"
              >
                <KeyIcon weight="fill" className="size-5" />

                <span>登录/注册</span>
              </button>
            </li>
          )}
        </ul>

        <div className="w-full flex items-center justify-around gap-2 border-t border-base-content/40 pt-2">
          <button className="btn btn-ghost rounded-full">
            <ScanIcon weight="fill" className="size-5" />

            <span>二维码</span>
          </button>

          <ThemeSwap
            className={{ outer: "btn btn-circle btn-ghost", icon: "w-5" }}
          />
        </div>
      </div>

      <LoginDialog
        isOpen={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
      />
    </div>
  );
}
