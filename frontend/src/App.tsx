import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { StudentPortal } from "./components/StudentPortal";
import { AdminPortal } from "./components/AdminPortal";

function AuthenticatedShell() {
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span>Study Room Reservation System</span>
          <span className={`badge badge-${user.role}`}>{user.role}</span>
        </div>

        <div className="topbar-user">
          <span>
            {user.fullName} (<strong>{user.username}</strong>)
          </span>
          <button type="button" className="btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="container">
        {user.role === "ADMIN" ? <AdminPortal /> : <StudentPortal />}
      </main>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AuthenticatedShell />
    </AuthProvider>
  );
}

export default App;
