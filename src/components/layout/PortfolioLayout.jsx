import { Outlet, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Languages, Menu, Moon, Sun } from "lucide-react";
import { usePreferences } from "../../contexts/PreferencesContext.jsx";
import { usePublicTable } from "../../pages/PublicPages.jsx";

const navigation = [
  ["navHome", "/"], ["navAbout", "/about"], ["navProjects", "/projects"],
  ["navEducation", "/education"],
  ["navCertificates", "/certificates"], ["navExperience", "/experience"],
  ["navServices", "/services"], ["navContact", "/contact"],
];

export function PortfolioLayout() {
  const { t, language, setLanguage, theme, setTheme } = usePreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const profiles = usePublicTable("profiles", { limit: 1 });
  const social = usePublicTable("social_links");
  const name = profiles.data[0]?.full_name;
  const profile = profiles.data[0];
  const localizedTitle = profile?.seo_title?.[language] || profile?.seo_title?.id || profile?.seo_title?.en;
  const localizedDescription = profile?.seo_description?.[language] || profile?.seo_description?.id || profile?.seo_description?.en;
  useEffect(() => {
    if (localizedTitle) document.title = localizedTitle;
    if (localizedTitle) document.querySelector('meta[property="og:title"]')?.setAttribute("content", localizedTitle);
    if (localizedDescription) {
      const description = document.querySelector('meta[name="description"]');
      if (description) description.setAttribute("content", localizedDescription);
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", localizedDescription);
    }
    if (profile?.avatar_url) document.querySelector('meta[property="og:image"]')?.setAttribute("content", profile.avatar_url);
  }, [localizedTitle, localizedDescription, profile?.avatar_url]);
  const switchLanguage = () => setLanguage(language === "id" ? "en" : "id");
  const switchTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  return (
    <>
      <header className="site-header">
        <nav className="nav-bar glass" aria-label={t("mainNavigation")}>
          <NavLink className="brand" to="/" onClick={() => setMenuOpen(false)}>{name || "Portfolio"}<span>.</span></NavLink>
          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            {navigation.filter(([, href]) => {
              const section = href === "/" ? "home" : href === "/education" ? "education" : href.slice(1);
              return profile?.section_visibility?.[section] !== false;
            }).map(([key, href]) => <NavLink key={href} to={href} end={href === "/"} className={({ isActive }) => isActive ? "active" : ""} onClick={() => setMenuOpen(false)}>{t(key)}</NavLink>)}
          </div>
          <div className="nav-actions">
            <button className="icon-button" aria-label={language === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"} onClick={switchLanguage}><Languages size={16} /><span>{language.toUpperCase()}</span></button>
            <button className="icon-button" aria-label={theme === "dark" ? t("lightMode") : t("darkMode")} onClick={switchTheme}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
            <button className="icon-button nav-menu-button" aria-label={t("toggleNavigation")} onClick={() => setMenuOpen(!menuOpen)}><Menu size={18} /></button>
          </div>
        </nav>
      </header>
      {profiles.error && <div className="shell error-state" role="alert"><p>{t("errorTitle")}</p><button className="button" onClick={profiles.retry}>{t("retry")}</button></div>}
      <Outlet context={{ sectionVisibility: profile?.section_visibility || {} }} />
      <footer className="site-footer">
        <div className="shell footer-inner">
          <span>© {new Date().getFullYear()} {name || "Portfolio"}. {language === "id" ? "Hak cipta dilindungi." : "All rights reserved."}</span>
          <nav className="footer-nav" aria-label={t("navDetails")}>{navigation.filter(([, href]) => {
            const section = href === "/" ? "home" : href === "/education" ? "education" : href.slice(1);
            return profile?.section_visibility?.[section] !== false;
          }).map(([key, href]) => <NavLink key={href} to={href}>{t(key)}</NavLink>)}</nav>
          <div className="footer-socials">{social.data.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer">{item.platform}</a>)}</div>
          <div className="nav-actions">
            <button className="button button-quiet" onClick={switchLanguage}>{language === "id" ? t("english") : t("indonesian")}</button>
            <button className="button button-quiet" onClick={switchTheme}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}{theme === "dark" ? t("themeLight") : t("themeDark")}</button>
            <a className="button button-quiet" href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>↑</a>
          </div>
        </div>
      </footer>
    </>
  );
}
