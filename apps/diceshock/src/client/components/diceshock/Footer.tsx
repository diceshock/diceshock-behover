import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";
import Logo from "@/client/assets/svg/black-simplify-with-text-logo.svg?react";
import { useTranslation } from "@/client/hooks/useTranslation";
import Gradient from "./Gradient";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <>
      <Gradient
        direction="col"
        className={{
          main: "w-full h-20",
          a: "bg-neutral",
          b: "bg-base-100",
        }}
      />

      <footer className="footer sm:footer-horizontal bg-neutral text-neutral-content p-10">
        <aside>
          <Logo className="w-32" />

          <p>
            {t("footer.companyName")}
            <br />
            {t("footer.companyNameEn")}
            <br />
            {t("footer.address")}
          </p>
          <p>
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-hover"
            >
              鄂ICP备2026020241号-1
            </a>
          </p>
        </aside>
        <nav>
          <h6 className="footer-title">{t("footer.services")}</h6>
          <Link to="/" className="link link-hover">
            {t("footer.inventory")}
          </Link>
          <Link to="/" className="link link-hover">
            {t("footer.agents")}
          </Link>
          <a href="/dash" className="link link-hover">
            {t("footer.dashboard")}
          </a>
        </nav>
        <nav>
          <h6 className="footer-title">{t("footer.aboutUs")}</h6>
          <Link to="/contact-us" className="link link-hover">
            {t("footer.contactUs")}
          </Link>
          <Link to="/" className="link link-hover">
            {t("footer.joinUs")}
          </Link>
          <Link to="/" className="link link-hover">
            {t("footer.termsOfService")}
          </Link>
          <Link to="/" className="link link-hover">
            {t("footer.cookiePolicy")}
          </Link>
        </nav>
        <nav>
          <h6 className="footer-title">{t("footer.friendlyLinks")}</h6>
          <a href="https://goddessfantasy.net" className="link link-hover">
            纯美苹果园
          </a>
          <a href="https://trow.cc/" className="link link-hover">
            The Ring of Wonder
          </a>
          <a href="https://www.gstonegames.com/" className="link link-hover">
            集石桌游
          </a>
        </nav>
      </footer>

      <button
        type="button"
        onClick={() =>
          document.scrollingElement?.scrollTo?.({
            top: 0,
            behavior: "smooth",
          })
        }
        className="w-full h-16 bg-primary hover:bg-base-100 hover:[&>h5]:text-base-content flex justify-between items-center"
      >
        <h5 className="mx-auto text-base-200 text-xl">
          {t("footer.backToTop")}
        </h5>
        <div className="w-16 h-full bg-base-100 flex justify-center items-center">
          <ArrowUpIcon className="size-10" />
        </div>
      </button>
    </>
  );
};

export default Footer;
