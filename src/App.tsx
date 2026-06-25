import { useEffect, useState } from "react";
import type { AppState, User } from "./types";
import { loadState, saveState, resetState } from "./store";
import { Login } from "./components/Login";
import { AppShell } from "./components/AppShell";
import { FlyerDashboard } from "./components/FlyerDashboard";
import { AdminDashboard } from "./components/AdminDashboard";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  function handleLogout() {
    setUser(null);
  }

  function handleReset() {
    if (confirm("Reset all data to defaults?")) {
      setState(resetState());
    }
  }

  if (!user) {
    return <Login users={state.users} onLogin={setUser} />;
  }

  return (
    <AppShell
      user={user}
      onLogout={handleLogout}
      tabs={
        user.role === "admin" ? undefined : undefined
      }
    >
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={handleReset}
          className="text-[11.5px] text-slate-400 hover:text-slate-600 underline-offset-2 hover:underline"
        >
          Reset demo data
        </button>
      </div>
      {user.role === "flyer" ? (
        <FlyerDashboard state={state} user={user} onChange={setState} />
      ) : (
        <AdminDashboard state={state} onChange={setState} />
      )}
    </AppShell>
  );
}
