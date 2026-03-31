import {
  WifiHighIcon,
  WifiLowIcon,
  WifiMediumIcon,
  WifiSlashIcon,
} from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import type { SignalLevel } from "@/client/hooks/useNetworkQuality";

interface Props {
  signalLevel: SignalLevel;
}

const CONFIG: Record<
  SignalLevel,
  { Icon: typeof WifiHighIcon; className: string }
> = {
  4: { Icon: WifiHighIcon, className: "text-success" },
  3: { Icon: WifiHighIcon, className: "text-success" },
  2: { Icon: WifiMediumIcon, className: "text-warning" },
  1: { Icon: WifiLowIcon, className: "text-error" },
  0: { Icon: WifiSlashIcon, className: "text-base-content/30" },
};

export default function NetworkSignalIndicator({ signalLevel }: Props) {
  const { Icon, className } = CONFIG[signalLevel];
  return <Icon className={clsx("size-4", className)} weight="bold" />;
}
