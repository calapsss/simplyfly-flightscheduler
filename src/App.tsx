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
      noHeader={user.role === "admin"}
    >
      {user.role === "flyer" ? (
        <FlyerDashboard state={state} user={user} onChange={setState} />
      ) : (
        <AdminDashboard state={state} onChange={setState} onReset={handleReset} />
      )}
    </AppShell>
  );
}
