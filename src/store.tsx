import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./lib/api";
import type { Issue, User } from "./lib/types";

/* ---------- Hash router ---------- */
export function useRoute() {
  const read = () => (window.location.hash.replace(/^#/, "") || "/").split("?")[0];
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => { setPath(read()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return path;
}
export const go = (to: string) => { window.location.hash = to; };
export function queryParam(name: string) {
  const q = window.location.hash.split("?")[1] || "";
  return new URLSearchParams(q).get(name);
}

/* ---------- App state ---------- */
interface Ctx {
  user: User | null;
  ready: boolean;
  issues: Issue[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  patchIssue: (id: string, fn: (i: Issue) => Issue) => void;
  toast: (msg: string) => void;
  /** Sends the user to login and brings them back after. */
  requireLogin: (next: string) => boolean;
}
const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const u = await api.getUser();
      setUser(u);
      // Live mode shows nothing to signed-out visitors: the data stays inside IIMC.
      if (api.mode === "live" && !u) setIssues([]);
      else setIssues(await api.listIssues());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    return api.onAuthChange(() => { refresh(); });
  }, [refresh]);

  const toast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const patchIssue = useCallback((id: string, fn: (i: Issue) => Issue) => {
    setIssues((list) => list.map((i) => (i.id === id ? fn(i) : i)));
  }, []);

  const requireLogin = useCallback(
    (next: string) => {
      if (user) return true;
      go(`/login?next=${encodeURIComponent(next)}`);
      return false;
    },
    [user],
  );

  return (
    <AppCtx.Provider value={{ user, ready, issues, loading, error, refresh, patchIssue, toast, requireLogin }}>
      {children}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </AppCtx.Provider>
  );
}
