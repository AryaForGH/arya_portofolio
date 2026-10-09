import { motion, useReducedMotion } from "framer-motion";
import { usePreferences } from "../../contexts/PreferencesContext.jsx";

export function LoadingScreen() {
  const { t } = usePreferences();
  const reduceMotion = useReducedMotion();
  return (
    <div className="loading-screen">
      <motion.div className="loading-mark" initial={reduceMotion ? false : { scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        P<span>.</span>
      </motion.div>
      <div className="loading-track"><motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8 }} /></div>
      <p>{t("loading")}</p>
    </div>
  );
}
