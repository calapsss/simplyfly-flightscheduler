import { useEffect, useRef, useState } from "react";
import type { AppState, User } from "./types";
import { loadState, saveState, resetState } from "./store";
import { Login } from "./components/Login";
import { AppShell } from "./components/AppShell";
import { FlyerDashboard } from "./components/FlyerDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { Button, Card } from "./components/ui";

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    loadState()
      .then((next) => {
        if (cancelled) return;
        skipNextSaveRef.current = true;
        setState(next);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load scheduler data.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      saveState(state)
        .then(() => setSaveError(null))
        .catch((error: unknown) => {
          setSaveError(error instanceof Error ? error.message : "Unable to save scheduler data.");
        });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [state]);

  function handleLogout() {
    setUser(null);
  }

  async function handleReset() {
    if (confirm("Reset all data to defaults?")) {
      try {
        const next = await resetState();
        skipNextSaveRef.current = true;
        setState(next);
        setSaveError(null);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Unable to reset scheduler data.");
      }
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-6 text-center">
          <h1 className="text-[18px] font-semibold text-navy-900">Scheduler data unavailable</h1>
          <p className="mt-2 text-[13px] text-slate-500">{loadError}</p>
          <Button className="mt-5" onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="p-6 text-center">
          <p className="text-[13px] font-medium text-navy-900">Loading scheduler data...</p>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Login users={state.users} onLogin={setUser} />;
  }

  return (
    <AppShell
      user={user}
      onLogout={handleLogout}
      noHeader={user.role === "admin"}
    >
      {saveError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Save failed: {saveError}
        </div>
      )}
      {user.role === "flyer" ? (
        <FlyerDashboard state={state} user={user} onChange={setState} />
      ) : (
        <AdminDashboard state={state} onChange={setState} onReset={handleReset} user={user} onLogout={handleLogout} />
      )}
    </AppShell>
  );
}
