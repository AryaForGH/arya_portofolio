import { createContext, useContext, useEffect, useState } from "react";
import { requireSupabase, supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);
async function getFunctionErrorCode(error) {
  const response = error?.context;
  if (response && typeof response.clone === "function") {
    const payload = await response.clone().json().catch(() => null);
    if (typeof payload?.code === "string") return payload.code;
    if (response.status === 429) return "LOGIN_RATE_LIMITED";
  }
  if (error?.name === "FunctionsFetchError") return "LOGIN_NETWORK_ERROR";
  return "LOGIN_SERVICE_ERROR";
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error("Unable to restore auth session", error);
      setSession(data?.session || null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  async function signIn(username, password) {
    const client = requireSupabase();
    const { data, error } = await client.functions.invoke("login-username", { body: { username, password } });
    if (error) throw new Error(await getFunctionErrorCode(error));
    if (!data?.access_token || !data?.refresh_token) throw new Error("Invalid login response");
    const { data: authData, error: authError } = await client.auth.setSession(data);
    if (authError) throw authError;
    return authData;
  }
  async function changeInitialPassword(password) {
    const client = requireSupabase();
    const { data, error } = await client.functions.invoke("change-password", { body: { password } });
    if (error) throw error;
    if (!data?.access_token || !data?.refresh_token) throw new Error("Invalid password update response");
    const { data: authData, error: sessionError } = await client.auth.setSession(data);
    if (sessionError) throw sessionError;
    return authData;
  }
  async function signOut() {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  }
  return <AuthContext.Provider value={{ session, loading, signIn, changeInitialPassword, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
