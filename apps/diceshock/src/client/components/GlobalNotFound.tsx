import { Link } from "@tanstack/react-router";
import Footer from "./diceshock/Footer";
import Header from "./diceshock/Header";

export default function GlobalNotFound() {
  return (
    <>
      <Header />

      <main className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="flex flex-col items-center justify-center text-center max-w-2xl">
          <p className="font-mono font-black text-[25vw] md:text-[18vw] lg:text-[12rem] leading-none text-primary/20 select-none">
            404
          </p>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold -mt-4 md:-mt-6 lg:-mt-8">
            来到了不存在的地方
          </h1>

          <p className="mt-4 text-base-content/60 text-sm md:text-base max-w-md">
            你访问的页面可能已被移除、名称已更改，或暂时不可用。
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/" className="btn btn-primary">
              返回主页
            </Link>

            <Link to="/contact-us" className="btn btn-ghost">
              联系我们
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
