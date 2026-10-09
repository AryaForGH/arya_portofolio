import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, BriefcaseBusiness, ChevronLeft, ChevronRight, FileBadge, FileText, FolderKanban, Globe2, Images, LayoutDashboard, LogOut, Mail, Settings, UserRound, Wrench } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { usePreferences } from "../../contexts/PreferencesContext.jsx";
import { useState } from "react";

const links = [
  ["dashboard", "dashboard", LayoutDashboard], ["profile", "profile", UserRound],
  ["projects", "projects", FolderKanban], ["certificates", "certificates", FileBadge],
  ["experience", "experiences", BriefcaseBusiness], ["services", "services", Wrench],
  ["skills", "skills", BarChart3], ["social-links", "social_links", Globe2],
  ["messages", "contact_messages", Mail], ["media", "media", Images], ["settings", "site_settings", Settings],
  ["settings/cv", "cvManagement", FileText],
];

export function AdminLayout() {
  const { signOut } = useAuth();
  const { t, language, setLanguage, theme, setTheme } = usePreferences();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  async function logout() {
    try { await signOut(); navigate("/admin/login", { replace: true }); }
    catch (error) { console.error("Unable to sign out", error); window.alert(t("genericError")); }
  }
  return <div className={`admin-shell ${collapsed ? "collapsed" : ""}`}>
    <aside className="admin-sidebar">
      <NavLink className="brand" to="/admin/dashboard">Portfolio<span>.</span> <small style={{ color: "var(--muted)", fontWeight: 500 }}>admin</small></NavLink>
      {links.map(([path, label, Icon]) => <NavLink key={path} to={`/admin/${path}`} end={path === "settings"} aria-label={t(label)} className={({ isActive }) => isActive ? "active" : ""}><Icon size={17} /><span>{t(label)}</span></NavLink>)}
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><div style={{ display: "flex", alignItems: "center", gap: 12 }}><button className="icon-button admin-collapse" aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")} title={collapsed ? t("expandSidebar") : t("collapseSidebar")} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button><strong>{t("admin")}</strong></div><div className="nav-actions">
        <button className="button button-quiet" onClick={() => setLanguage(language === "id" ? "en" : "id")}>{language.toUpperCase()}</button>
        <button className="icon-button" aria-label={theme === "dark" ? t("lightMode") : t("darkMode")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☼" : "☾"}</button>
        <button className="button button-quiet" onClick={logout}><LogOut size={15} />{t("logout")}</button>
      </div></header>
      <Outlet />
    </div>
  </div>;
}
