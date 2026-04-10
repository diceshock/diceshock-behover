import {
  ArrowUUpLeftIcon,
  HourglassIcon,
  KeyIcon,
  ScanIcon,
  SignOutIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import useAuth from "@/client/hooks/useAuth";
import useTempIdentity from "@/client/hooks/useTempIdentity";
import trpcClientPublic from "@/shared/utils/trpc";
import ThemeSwap from "../../ThemeSwap";
import LoginDialog from "./LoginDialog";
import QRScannerDialog from "./QRScannerDialog";

interface ActiveOccupancy {
  code: string;
  name: string;
}

function useActiveOccupancy(): ActiveOccupancy | null {
  const { userInfo } = useAuth();
  const { tempIdentity } = useTempIdentity();
  const [occupancy, setOccupancy] = useState<ActiveOccupancy | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        let occs: Array<{ code: string; name: string }> = [];

        if (userInfo) {
          occs = await trpcClientPublic.tables.getMyActiveOccupancy.query();
        } else if (tempIdentity) {
          occs = await trpcClientPublic.tempIdentity.getActiveOccupancy.query({
            tempId: tempIdentity.tempId,
          });
        }

        if (!cancelled) {
          const first = occs[0] ?? null;
          setOccupancy(first ? { code: first.code, name: first.name } : null);
        }
      } catch {
        if (!cancelled) setOccupancy(null);
      }
    };

    void check();
    const interval = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userInfo, tempIdentity]);

  return occupancy;
}

function AvatarMenuContent() {
  const { userInfo, signOut } = useAuth();
  const navigate = useNavigate();
  const activeOccupancy = useActiveOccupancy();

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  const name = userInfo?.nickname ?? "Anonymous Shock";
  const isTiming = !!activeOccupancy;

  return (
    <div className="dropdown dropdown-bottom dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost rounded-full pl-1"
      >
        {isTiming ? (
          <div className="size-8 flex items-center justify-center">
            <HourglassIcon
              weight="duotone"
              className="size-6 text-primary"
              style={{ animation: "hourglass-flip 3s ease-in-out infinite" }}
            />
          </div>
        ) : (
          <div className="avatar size-8 avatar-placeholder">
            <div className="bg-primary text-gray-900 w-16 rounded-full overflow-hidden">
              <span className="text-lg">{name.slice(0, 2)}</span>
            </div>
          </div>
        )}

        <p className="max-w-20 truncate">{name}</p>
      </div>

      <div
        tabIndex={-1}
        className="dropdown-content bg-base-100 rounded-box z-1 p-2 shadow-sm"
      >
        <ul className="menu p-2 w-44">
          {activeOccupancy && (
            <li>
              <button
                onClick={() =>
                  navigate({
                    to: "/t/$code",
                    params: { code: activeOccupancy.code },
                    search: { from: "" },
                  })
                }
                className="px-5 py-3 flex items-center justify-between"
              >
                <ArrowUUpLeftIcon weight="fill" className="size-5" />

                <span>返回桌台</span>
              </button>
            </li>
          )}

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
                  onClick={signOut}
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
          <button
            onClick={() => setIsQRScannerOpen(true)}
            className="btn btn-ghost rounded-full"
          >
            <ScanIcon weight="fill" className="size-5" />

            <span>扫码</span>
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

      <QRScannerDialog
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />
    </div>
  );
}

function AvatarMenuSkeleton() {
  return (
    <div className="dropdown dropdown-bottom dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost rounded-full pl-1"
      >
        <div className="skeleton rounded-full size-8" />
        <div className="skeleton h-4 w-20" />
      </div>
    </div>
  );
}

export default function AvatarMenu() {
  return (
    <ClientOnly fallback={<AvatarMenuSkeleton />}>
      <AvatarMenuContent />
    </ClientOnly>
  );
}
