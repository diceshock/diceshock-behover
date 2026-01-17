import { KeyIcon, ScanIcon, UserIcon } from "@phosphor-icons/react/dist/ssr";
import ThemeSwap from "../../ThemeSwap";

export default function AvatarMenu() {
  return (
    <div className="dropdown dropdown-bottom dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost rounded-full pl-1"
      >
        <div className="avatar size-8 avatar-placeholder">
          <div className="bg-primary text-gray-900 w-16 rounded-full">
            <span className="text-lg">Jo</span>
          </div>
        </div>

        <p className="max-w-20 truncate">
          John 117John 117John 117John 117John 117
        </p>
      </div>

      <div
        tabIndex={-1}
        className="dropdown-content bg-base-100 rounded-box z-1 p-2 shadow-sm"
      >
        <ul className="menu p-2 w-44">
          <li>
            <a className="px-5 flex items-center justify-between">
              <UserIcon weight="fill" className="size-5" />

              <span>我的账户</span>
            </a>
          </li>
          <li>
            <a className="px-5 py-3 flex items-center justify-between">
              <KeyIcon weight="fill" className="size-5" />

              <span>账户迁移</span>
            </a>
          </li>
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
    </div>
  );
}
