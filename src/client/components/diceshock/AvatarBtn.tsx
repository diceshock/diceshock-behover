import { UserIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";
import Image from "../image";
import useCrossData from "@/client/hooks/useCrossData";

export default function AvatarBtn() {
    const { UserInfo: { user } = {} } = useCrossData() ?? {};
    
    if (!user)
        return (
            <Link to="/auth" className="btn btn-ghost rounded-full pl-1">
                <div className="avatar size-8 avatar-placeholder">
                    <div className="bg-primary text-gray-900 w-16 rounded-full">
                        <UserIcon weight="bold" className="size-5" />
                    </div>
                </div>

                <p className="max-w-20 truncate">未登陆</p>
            </Link>
        );

    return (
        <Link to="/auth" className="btn btn-ghost rounded-full pl-1">
            <div className="avatar size-8 avatar-placeholder">
                <div className="bg-primary text-gray-900 w-16 rounded-full">
                    {user.image ? (
                        <Image
                            src={user.image}
                            alt={user?.name ?? user.email ?? "没名字的家伙"}
                            className="w-full h-full rounded-full"
                        />
                    ) : (
                        <span className="text-lg uppercase">
                            {(user?.name ?? user.email ?? "X").at(0)}
                        </span>
                    )}
                </div>
            </div>

            <p className="max-w-20 truncate">
                {user?.name ?? user.email ?? "没名字的家伙"}
            </p>
        </Link>
    );
}
