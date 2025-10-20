import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$site_name}/mail-send")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <main className="w-full h-[calc(100vh-4.25rem)] flex">
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-4">
                <h1 className="font-bold text-5xl text-primary text-nowrap">
                    你的邮件已发送!
                </h1>

                <h2 className="font-bold text-xl text-nowrap">
                    请检查你的邮箱 (可能被遗弃在垃圾邮件里了QAQ)
                </h2>

                <div className="mt-11 w-full flex justify-center items-center flex-col md:flex-row">
                    <Link
                        to="/"
                        className="btn btn-primary mr-0 mb-5 md:mr-5 md:mb-0"
                    >
                        返回主页
                    </Link>

                    <Link to="/" className="btn btn-ghost">
                        联系我们
                    </Link>
                </div>
            </div>
        </main>
    );
}
