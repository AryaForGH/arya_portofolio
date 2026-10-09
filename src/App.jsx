import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePreferences } from "./contexts/PreferencesContext.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";
import { supabaseConfigured } from "./lib/supabase.js";
import { PortfolioLayout } from "./components/layout/PortfolioLayout.jsx";
import { AdminLayout } from "./components/admin/AdminLayout.jsx";
import { LoadingScreen } from "./components/common/LoadingScreen.jsx";
import { EducationPage, PublicPage, ProjectDetailPage } from "./pages/PublicPages.jsx";
const AdminLoginPage = lazy(() => import("./pages/AdminPages.jsx").then((module) => ({ default: module.AdminLoginPage })));
const AdminResourcePage = lazy(() => import("./pages/AdminPages.jsx").then((module) => ({ default: module.AdminResourcePage })));
const DashboardPage = lazy(() => import("./pages/AdminPages.jsx").then((module) => ({ default: module.DashboardPage })));
const MediaManagerPage = lazy(() => import("./pages/AdminPages.jsx").then((module) => ({ default: module.MediaManagerPage })));
const CVManagementPage = lazy(() => import("./pages/AdminPages.jsx").then((module) => ({ default: module.CVManagementPage })));

const AdminSettingsPage = lazy(() => import("./pages/AdminSettingsPage.jsx"));

export default function App() {
  const { t } = usePreferences();
  const { session, loading: authLoading } = useAuth();
  const [initial, setInitial] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setInitial(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  if (initial) return <LoadingScreen />;

  return (
    <AnimatePresence mode="wait">
      <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        {!supabaseConfigured && (
          <div className="setup-banner">
            {t("setupBanner")}
          </div>
        )}
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route element={<PortfolioLayout />}>
              <Route path="/" element={<PublicPage section="home" />} />
              <Route path="/about" element={<PublicPage section="about" />} />
              <Route path="/education" element={<EducationPage />} />
              <Route path="/projects" element={<PublicPage section="projects" />} />
              <Route path="/projects/:slug" element={<ProjectDetailPage />} />
              <Route path="/certificates" element={<PublicPage section="certificates" />} />
              <Route path="/experience" element={<PublicPage section="experience" />} />
              <Route path="/services" element={<PublicPage section="services" />} />
              <Route path="/contact" element={<PublicPage section="contact" />} />
            </Route>
            <Route path="/admin/login" element={session?.user?.app_metadata?.role === "admin" ? <Navigate to="/admin/dashboard" replace /> : <AdminLoginPage />} />
            <Route path="/admin" element={authLoading ? <LoadingScreen /> : session?.user?.app_metadata?.role === "admin" ? <AdminLayout /> : <Navigate to="/admin/login" replace />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="profile" element={<AdminResourcePage resource="profiles" />} />
              <Route path="projects" element={<AdminResourcePage resource="projects" />} />
              <Route path="certificates" element={<AdminResourcePage resource="certificates" />} />
              <Route path="experience" element={<AdminResourcePage resource="experiences" />} />
              <Route path="services" element={<AdminResourcePage resource="services" />} />
              <Route path="skills" element={<AdminResourcePage resource="skills" />} />
              <Route path="social-links" element={<AdminResourcePage resource="social_links" />} />
              <Route path="messages" element={<AdminResourcePage resource="contact_messages" />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="settings/cv" element={<CVManagementPage />} />
              <Route path="media" element={<MediaManagerPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
