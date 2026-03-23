import Footer from "./diceshock/Footer";
import Header from "./diceshock/Header";

export default function GlobalError({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "发生了未知错误，请稍后再试。";

  return (
    <>
      <Header />

      <main className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="flex flex-col items-center justify-center text-center max-w-2xl">
          <p className="font-mono font-black text-[25vw] md:text-[18vw] lg:text-[12rem] leading-none text-error/20 select-none">
            500
          </p>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold -mt-4 md:-mt-6 lg:-mt-8">
            好像发生了错误
          </h1>

          <p className="mt-4 text-base-content/60 text-sm md:text-base max-w-md">
            服务器遇到了意外问题，我们正在努力修复中。
          </p>

          <div className="mt-4 w-full max-w-lg">
            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-sm font-medium text-base-content/50">
                错误详情
              </div>
              <div className="collapse-content">
                <pre className="text-xs text-error whitespace-pre-wrap break-all overflow-auto max-h-40">
                  {message}
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a href="/" className="btn btn-primary">
              返回主页
            </a>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-ghost"
            >
              刷新页面
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
